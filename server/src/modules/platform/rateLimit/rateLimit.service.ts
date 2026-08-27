import { runTableQuery, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';
import {
  RATE_LIMIT_ALGORITHMS,
  RATE_LIMIT_AUDIENCES,
  RATE_LIMIT_KEYS,
  RATE_LIMIT_MODES,
  RATE_LIMIT_OPERATION_TYPES,
  RATE_LIMIT_SURFACES,
} from './rateLimit.types';
import {
  RateLimitEventModel,
  RateLimitRuleModel,
  RateLimitSystemModel,
  getRateLimitSettingsDoc,
  type IRateLimitEvent,
  type IRateLimitRule,
} from './rateLimit.model';
import { flushRateLimitCounters, invalidateRateLimitCache } from './rateLimit.enforcer';
import { resetAll, storeEngine } from './rateLimit.store';

/**
 * Everything the Tech portal's Rate Limiting console reads and writes.
 *
 * The one rule that matters here: every write invalidates the enforcer's cache,
 * so an operator who tightens a limit sees it take effect on the next request
 * rather than up to fifteen seconds later while they wonder if it saved.
 */

const RULE_TABLE = {
  searchFields: ['name', 'description', 'app'],
  sortFields: {
    name: 'name',
    priority: 'priority',
    surface: 'surface',
    app: 'app',
    channel: 'channel',
    mode: 'mode',
    limit: 'limit',
    window_seconds: 'window_seconds',
    hit_count: 'hit_count',
    blocked_count: 'blocked_count',
    last_blocked_at: 'last_blocked_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    enabled: { type: 'boolean' as const },
    mode: { type: 'enum' as const },
    surface: { type: 'enum' as const },
    app: { type: 'string' as const },
    channel: { type: 'enum' as const },
    key_by: { type: 'enum' as const },
    algorithm: { type: 'enum' as const },
    audience: { type: 'enum' as const },
  },
  defaultSort: { priority: 1 as const, _id: 1 as const },
};

const EVENT_TABLE = {
  searchFields: ['rule_name', 'limit_key', 'operation', 'path', 'ip', 'user_email'],
  sortFields: {
    created_at: 'created_at',
    rule_name: 'rule_name',
    surface: 'surface',
    app: 'app',
    count: 'count',
  },
  filterFields: {
    mode: { type: 'enum' as const },
    surface: { type: 'enum' as const },
    app: { type: 'string' as const },
    channel: { type: 'enum' as const },
    rule_id: { type: 'string' as const },
    created_at: { type: 'date' as const },
  },
  defaultSort: { created_at: -1 as const },
};

/** Fields a client may set. Counters and timestamps are the server's alone. */
const WRITABLE = [
  'name',
  'description',
  'enabled',
  'mode',
  'priority',
  'surface',
  'app',
  'channel',
  'audience',
  'operations',
  'operation_type',
  'paths',
  'methods',
  'key_by',
  'algorithm',
  'limit',
  'window_seconds',
  'burst',
  'block_seconds',
  'exempt_roles',
  'exempt_ips',
  'message',
  'notify_slack',
] as const;

function pickWritable(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of WRITABLE) {
    if (input[field] !== undefined) out[field] = input[field];
  }
  return out;
}

export const rateLimitService = {
  /* ------------------------------- settings ------------------------------ */

  async getSettings() {
    const doc = await getRateLimitSettingsDoc();
    const [rules, activeRules, events] = await Promise.all([
      RateLimitRuleModel.countDocuments({}),
      RateLimitRuleModel.countDocuments({ enabled: true }),
      RateLimitEventModel.estimatedDocumentCount(),
    ]);
    return {
      ...doc.toObject(),
      // Not a stored field: whether the counters are shared across replicas is
      // a fact about the deployment, and reporting a stale copy of it would be
      // the one thing on this page nobody could verify.
      store: storeEngine(),
      rule_count: rules,
      active_rule_count: activeRules,
      event_count: events,
    };
  },

  async updateSettings(input: Record<string, unknown>) {
    const doc = await getRateLimitSettingsDoc();
    doc.set(input);
    await doc.save();
    invalidateRateLimitCache();
    return this.getSettings();
  },

  /* --------------------------------- rules ------------------------------- */

  async rulesTable(query?: TableQueryInput | null) {
    await flushRateLimitCounters();
    const page = await runTableQuery<IRateLimitRule>(RateLimitRuleModel, {}, query, RULE_TABLE);
    return { rows: page.docs, total: page.total };
  },

  async listRules() {
    return RateLimitRuleModel.find({}).sort({ priority: 1, _id: 1 });
  },

  async getRule(id: string) {
    return RateLimitRuleModel.findById(id);
  },

  async createRule(input: Record<string, unknown>) {
    const doc = await RateLimitRuleModel.create(pickWritable(input));
    invalidateRateLimitCache();
    logs.server.info('rateLimit', 'createRule', { rule: doc.name });
    return doc;
  },

  async updateRule(id: string, input: Record<string, unknown>) {
    const doc = await RateLimitRuleModel.findByIdAndUpdate(id, pickWritable(input), { new: true });
    invalidateRateLimitCache();
    return doc;
  },

  async setRuleEnabled(id: string, enabled: boolean) {
    const doc = await RateLimitRuleModel.findByIdAndUpdate(id, { enabled }, { new: true });
    invalidateRateLimitCache();
    return doc;
  },

  async deleteRule(id: string) {
    await RateLimitRuleModel.findByIdAndDelete(id);
    invalidateRateLimitCache();
    return true;
  },

  /** Reset one rule's lifetime counters without touching what it does. */
  async resetRuleCounters(id: string) {
    const doc = await RateLimitRuleModel.findByIdAndUpdate(
      id,
      { hit_count: 0, blocked_count: 0, $unset: { last_blocked_at: 1, last_hit_at: 1 } },
      { new: true },
    );
    return doc;
  },

  /* -------------------------------- systems ------------------------------ */

  /** Every system that has ever called, with what it has spent. */
  async systems() {
    await flushRateLimitCounters();
    const docs = await RateLimitSystemModel.find({}).sort({ requests: -1, surface: 1, app: 1 });
    const rules = await RateLimitRuleModel.find({ enabled: true }, 'surface app').lean();
    return docs.map((doc) => ({
      ...doc.toObject(),
      // How many enabled rules could govern this system, so the page answers
      // "is anything actually watching this one" without opening the rules.
      rule_count: rules.filter(
        (r) =>
          (r.surface === 'ALL' || r.surface === doc.surface) &&
          (r.app === '*' || r.app === doc.app),
      ).length,
    }));
  },

  /* -------------------------------- events ------------------------------- */

  async eventsTable(query?: TableQueryInput | null) {
    const page = await runTableQuery<IRateLimitEvent>(RateLimitEventModel, {}, query, EVENT_TABLE);
    return { rows: page.docs, total: page.total };
  },

  async clearEvents() {
    const { deletedCount } = await RateLimitEventModel.deleteMany({});
    return deletedCount ?? 0;
  },

  /** Everything the console's header strip shows, over the last 24 hours. */
  async stats() {
    await flushRateLimitCounters();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [blocked, monitored, byRule, bySystem] = await Promise.all([
      RateLimitEventModel.countDocuments({ created_at: { $gte: since }, mode: 'ENFORCE' }),
      RateLimitEventModel.countDocuments({ created_at: { $gte: since }, mode: 'MONITOR' }),
      RateLimitEventModel.aggregate<{ _id: string; count: number }>([
        { $match: { created_at: { $gte: since } } },
        { $group: { _id: '$rule_name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      RateLimitEventModel.aggregate<{ _id: { surface: string; app: string }; count: number }>([
        { $match: { created_at: { $gte: since } } },
        { $group: { _id: { surface: '$surface', app: '$app' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);
    return {
      store: storeEngine(),
      blocked_24h: blocked,
      monitored_24h: monitored,
      top_rules: byRule.map((r) => ({ label: r._id, count: r.count })),
      top_systems: bySystem.map((r) => ({
        label: `${r._id.surface} / ${r._id.app}`,
        count: r.count,
      })),
    };
  },

  /** Wipe every live counter and cool-off. Rules and settings are untouched. */
  async resetCounters() {
    await resetAll();
    invalidateRateLimitCache();
    return true;
  },

  /* -------------------------------- options ------------------------------ */

  /**
   * The vocabulary the rule editor renders.
   *
   * Served rather than repeated in the portal, so a surface, an algorithm or a
   * newly-seen app becomes an option in the editor without a portal release —
   * `apps` in particular is read from the systems that have actually called.
   */
  async options() {
    const [systems, roles] = await Promise.all([
      RateLimitSystemModel.find({}, 'surface app label').sort({ app: 1 }).lean(),
      import('@modules/access/role/rbac.service').then((m) => m.rbacService.listRoles()),
    ]);
    return {
      surfaces: [...RATE_LIMIT_SURFACES],
      channels: ['GRAPHQL', 'REST', 'SOCKET'],
      key_by: [...RATE_LIMIT_KEYS],
      algorithms: [...RATE_LIMIT_ALGORITHMS],
      modes: [...RATE_LIMIT_MODES],
      audiences: [...RATE_LIMIT_AUDIENCES],
      operation_types: [...RATE_LIMIT_OPERATION_TYPES],
      apps: systems.map((s) => ({ surface: s.surface, app: s.app, label: s.label || s.app })),
      roles: (roles as Array<{ key: string; name: string }>).map((r) => ({
        key: r.key,
        name: r.name,
      })),
    };
  },

  /** Delete events past the admin retention window. Run by the daily sweep. */
  async purgeOldEvents(): Promise<number> {
    const settings = await getRateLimitSettingsDoc();
    const cutoff = new Date(Date.now() - settings.event_retention_days * 24 * 60 * 60 * 1000);
    const { deletedCount } = await RateLimitEventModel.deleteMany({ created_at: { $lt: cutoff } });
    return deletedCount ?? 0;
  },
};
