import { logs } from '@observability/log';
import {
  RateLimitEventModel,
  RateLimitRuleModel,
  RateLimitSystemModel,
  getRateLimitSettingsDoc,
  type IRateLimitRule,
  type IRateLimitSettings,
} from './rateLimit.model';
import { ipListed, isExempt, limitKey, ruleMatches } from './rateLimit.match';
import { block, blockedFor, consume } from './rateLimit.store';
import type { RateLimitDecision, RateLimitRequest } from './rateLimit.types';

/**
 * The decision, made on every single request, so everything here is built for
 * that: the rules and the settings are held in memory and refreshed on a
 * timer (and immediately on an edit), the counters the console shows are
 * buffered and flushed in batches, and nothing on the hot path awaits Mongo.
 *
 * A failure anywhere in here ALLOWS the request. A limiter that refuses traffic
 * because its own bookkeeping broke has turned a protection into the outage.
 */

const RULE_CACHE_MS = 15_000;
const FLUSH_INTERVAL_MS = 30_000;
/** One recorded event per rule+key per this long, so a flood writes one row. */
const EVENT_DEDUPE_MS = 10_000;

let rules: IRateLimitRule[] = [];
let rulesLoadedAt = 0;
let settings: IRateLimitSettings | null = null;
let settingsLoadedAt = 0;

/** Buffered rule counters: rule id -> hits / blocks since the last flush. */
const ruleCounters = new Map<string, { hits: number; blocks: number; blockedAt?: Date }>();
/** Buffered system traffic: `SURFACE|app` -> requests / blocks since the flush. */
const systemCounters = new Map<string, { requests: number; blocked: number }>();
/** Last time an event was written for a rule+key, to keep a flood to one row. */
const lastEventAt = new Map<string, number>();

let flushTimer: NodeJS.Timeout | null = null;

/* --------------------------------- caches --------------------------------- */

async function loadRules(): Promise<IRateLimitRule[]> {
  const now = Date.now();
  if (now - rulesLoadedAt < RULE_CACHE_MS) return rules;
  rulesLoadedAt = now;
  try {
    rules = await RateLimitRuleModel.find({ enabled: true }).sort({ priority: 1, _id: 1 });
  } catch (err) {
    logs.server.warn('rateLimit', 'loadRules', { error: err });
  }
  return rules;
}

async function loadSettings(): Promise<IRateLimitSettings | null> {
  const now = Date.now();
  if (settings && now - settingsLoadedAt < RULE_CACHE_MS) return settings;
  settingsLoadedAt = now;
  try {
    settings = await getRateLimitSettingsDoc();
  } catch (err) {
    logs.server.warn('rateLimit', 'loadSettings', { error: err });
  }
  return settings;
}

/** Drop both caches, so the next request reads the edit that just landed. */
export function invalidateRateLimitCache(): void {
  rulesLoadedAt = 0;
  settingsLoadedAt = 0;
}

/* -------------------------------- counters -------------------------------- */

function countRule(ruleId: string, blocked: boolean): void {
  const entry = ruleCounters.get(ruleId) ?? { hits: 0, blocks: 0 };
  entry.hits += 1;
  if (blocked) {
    entry.blocks += 1;
    entry.blockedAt = new Date();
  }
  ruleCounters.set(ruleId, entry);
}

function countSystem(req: RateLimitRequest, blocked: boolean): void {
  const key = `${req.surface}|${req.app}`;
  const entry = systemCounters.get(key) ?? { requests: 0, blocked: 0 };
  entry.requests += 1;
  if (blocked) entry.blocked += 1;
  systemCounters.set(key, entry);
}

async function flushRuleCounters(): Promise<void> {
  if (ruleCounters.size === 0) return;
  const batch = [...ruleCounters];
  ruleCounters.clear();
  await RateLimitRuleModel.bulkWrite(
    batch.map(([id, c]) => ({
      updateOne: {
        filter: { _id: id },
        update: {
          $inc: { hit_count: c.hits, blocked_count: c.blocks },
          $set: c.blockedAt
            ? { last_hit_at: new Date(), last_blocked_at: c.blockedAt }
            : { last_hit_at: new Date() },
        },
      },
    })),
    { ordered: false },
  );
}

async function flushSystemCounters(): Promise<void> {
  if (systemCounters.size === 0) return;
  const batch = [...systemCounters];
  systemCounters.clear();
  await RateLimitSystemModel.bulkWrite(
    batch.map(([key, c]) => {
      const [surface, app] = key.split('|');
      return {
        updateOne: {
          filter: { surface, app },
          update: {
            $inc: { requests: c.requests, blocked: c.blocked },
            $set: { last_seen_at: new Date() },
            $setOnInsert: { label: app },
          },
          upsert: true,
        },
      };
    }),
    { ordered: false },
  );
}

/**
 * Start the periodic flush of the buffered counters.
 *
 * Unref'd: a timer is not a reason to keep the process alive, and jest would
 * otherwise hang on an open handle after every suite that touches this module.
 */
export function startRateLimitFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushRateLimitCounters().catch((err) => {
      logs.server.warn('rateLimit', 'flush', { error: err });
    });
  }, FLUSH_INTERVAL_MS);
  flushTimer.unref?.();
}

/** Write the buffered counters out now. Also called before the console reads. */
export async function flushRateLimitCounters(): Promise<void> {
  await Promise.all([flushRuleCounters(), flushSystemCounters()]);
}

/* --------------------------------- events --------------------------------- */

interface EventInput {
  rule: IRateLimitRule;
  req: RateLimitRequest;
  key: string;
  count: number;
  retryAfter: number;
  userAgent?: string;
  userEmail?: string;
}

function shouldRecord(ruleId: string, key: string): boolean {
  const dedupeKey = `${ruleId}:${key}`;
  const now = Date.now();
  const last = lastEventAt.get(dedupeKey) ?? 0;
  if (now - last < EVENT_DEDUPE_MS) return false;
  lastEventAt.set(dedupeKey, now);
  // The map only ever holds keys seen in the last window; a flood of distinct
  // addresses would otherwise grow it without bound.
  if (lastEventAt.size > 5000) {
    for (const [k, at] of lastEventAt) {
      if (now - at > EVENT_DEDUPE_MS) lastEventAt.delete(k);
    }
  }
  return true;
}

async function recordEvent(input: EventInput, mode: 'ENFORCE' | 'MONITOR'): Promise<void> {
  const { rule, req } = input;
  if (!shouldRecord(String(rule._id), input.key)) return;
  await RateLimitEventModel.create({
    rule_id: String(rule._id),
    rule_name: rule.name,
    mode,
    surface: req.surface,
    app: req.app,
    channel: req.channel,
    operation: req.operation,
    path: req.path,
    method: req.method,
    limit_key: input.key,
    key_by: rule.key_by,
    ip: req.ip,
    user_id: req.userId,
    user_email: input.userEmail,
    device_id: req.deviceId,
    user_agent: input.userAgent,
    count: input.count,
    limit: rule.limit,
    retry_after: input.retryAfter,
  });
}

/** Announce a refusal in Slack, if this rule (or the master setting) asked. */
async function announce(rule: IRateLimitRule, req: RateLimitRequest, key: string): Promise<void> {
  const { slackService } = await import('@modules/platform/slack/slack.service');
  const where = req.operation ?? req.path ?? req.channel;
  await slackService.send({
    text: `Rate limit hit — *${rule.name}* refused ${key} on ${req.surface}/${req.app} at \`${where}\` (limit ${rule.limit}/${rule.window_seconds}s).`,
  });
}

/** Everything that happens AFTER the caller has been answered. */
function reportBreach(input: EventInput, mode: 'ENFORCE' | 'MONITOR', notify: boolean): void {
  const { rule, req } = input;
  if (mode === 'ENFORCE' && rule.block_seconds > 0) {
    block(`${rule._id}:${input.key}`, rule.block_seconds).catch((err) => {
      logs.server.warn('rateLimit', 'block', { error: err });
    });
  }
  recordEvent(input, mode).catch((err) => {
    logs.server.warn('rateLimit', 'recordEvent', { error: err });
  });
  if (notify) {
    announce(rule, req, input.key).catch((err) => {
      logs.server.warn('rateLimit', 'announce', { error: err });
    });
  }
}

/* -------------------------------- evaluate -------------------------------- */

/** Extra request facts worth recording on a breach, but never matched on. */
export interface RateLimitContextInfo {
  userAgent?: string;
  userEmail?: string;
}

function refusal(rule: IRateLimitRule, retryAfter: number, message: string): RateLimitDecision {
  return {
    allowed: false,
    rule_id: String(rule._id),
    rule_name: rule.name,
    message: rule.message ?? message,
    limit: rule.limit,
    remaining: 0,
    retry_after: retryAfter,
  };
}

/**
 * Run one rule against one request.
 *
 * Returns a refusal, a "would have refused" note, or null for "this rule has
 * nothing to say". Every matching rule is asked — a per-address ceiling and a
 * per-operation ceiling are both real, and first-match-wins would silently
 * disable whichever was written second.
 */
async function applyRule(
  rule: IRateLimitRule,
  req: RateLimitRequest,
  config: IRateLimitSettings,
  info: RateLimitContextInfo,
): Promise<RateLimitDecision | null> {
  if (!ruleMatches(rule, req)) return null;
  if (isExempt(rule, req, config.exempt_roles)) return null;
  const key = limitKey(rule, req);
  if (!key) return null;

  const mode = config.monitor_only ? 'MONITOR' : rule.mode;
  const cooling = rule.block_seconds > 0 ? await blockedFor(`${rule._id}:${key}`) : 0;
  if (cooling > 0 && mode === 'ENFORCE') {
    countRule(String(rule._id), true);
    return refusal(rule, cooling, config.default_message);
  }

  const result = await consume({
    key: `${rule._id}:${key}`,
    algorithm: rule.algorithm,
    limit: rule.limit,
    windowSeconds: rule.window_seconds,
    burst: rule.burst,
  });
  countRule(String(rule._id), result.exceeded);
  if (!result.exceeded) return null;

  const retryAfter = rule.block_seconds > 0 ? rule.block_seconds : result.resetSeconds;
  reportBreach(
    { rule, req, key, count: result.count, retryAfter, ...info },
    mode,
    rule.notify_slack || config.notify_slack,
  );
  if (mode === 'MONITOR') {
    return { allowed: true, monitored: true, rule_id: String(rule._id), rule_name: rule.name };
  }
  return refusal(rule, retryAfter, config.default_message);
}

const ALLOWED: RateLimitDecision = { allowed: true };

/**
 * The one entry point. Every seam — the GraphQL plugin, the REST middleware,
 * the socket handshake, the public API key check — asks this and nothing else,
 * so a rule written once governs all of them.
 */
export async function evaluate(
  req: RateLimitRequest,
  info: RateLimitContextInfo = {},
): Promise<RateLimitDecision> {
  try {
    const config = await loadSettings();
    if (!config?.enabled) return ALLOWED;
    if (req.ip && ipListed(config.allow_ips, req.ip)) return ALLOWED;
    if (req.ip && ipListed(config.block_ips, req.ip)) {
      countSystem(req, true);
      return {
        allowed: false,
        rule_name: 'Blocked address',
        message: config.default_message,
        retry_after: 3600,
        limit: 0,
        remaining: 0,
      };
    }

    let monitored: RateLimitDecision | null = null;
    for (const rule of await loadRules()) {
      const decision = await applyRule(rule, req, config, info);
      if (decision?.allowed === false) {
        countSystem(req, true);
        return decision;
      }
      if (decision?.monitored) monitored = decision;
    }
    countSystem(req, false);
    return monitored ?? ALLOWED;
  } catch (err) {
    logs.server.error('rateLimit', 'evaluate', { error: err });
    return ALLOWED;
  }
}
