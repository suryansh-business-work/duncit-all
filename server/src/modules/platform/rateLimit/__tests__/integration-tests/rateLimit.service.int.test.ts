/**
 * Everything the Tech portal's Rate Limiting console reads and writes, against
 * a real database: settings, rules, systems, the breach log, the header stats
 * and the retention sweep. Only the role list (another module's data) and the
 * enforcer's cache are stubbed.
 */
jest.mock('@modules/access/role/rbac.service', () => ({
  rbacService: { listRoles: jest.fn().mockResolvedValue([{ key: 'SUPPORT', name: 'Support', extra: 1 }]) },
}));
jest.mock('../../rateLimit.enforcer', () => ({
  flushRateLimitCounters: jest.fn().mockResolvedValue(undefined),
  invalidateRateLimitCache: jest.fn(),
}));

import { rateLimitService } from '../../rateLimit.service';
import { flushRateLimitCounters, invalidateRateLimitCache } from '../../rateLimit.enforcer';
import { RateLimitEventModel, RateLimitRuleModel, RateLimitSystemModel } from '../../rateLimit.model';
import { resetAll } from '../../rateLimit.store';

const DAY = 86_400_000;

const ruleInput = (over: Record<string, unknown> = {}) => ({
  name: 'Login', mode: 'ENFORCE', surface: 'ALL', app: '*', channel: 'GRAPHQL', key_by: 'IP', algorithm: 'FIXED_WINDOW', limit: 5, window_seconds: 60, ...over,
});

const event = (over: Record<string, unknown> = {}) =>
  RateLimitEventModel.create({
    rule_id: 'r1', rule_name: 'Login', mode: 'ENFORCE', surface: 'MWEB', app: 'duncit', channel: 'GRAPHQL', limit_key: 'ip:1.1.1.1', key_by: 'IP',
    ip: '1.1.1.1', count: 6, limit: 5, retry_after: 30, ...over,
  });

afterEach(() => jest.clearAllMocks());

describe('settings', () => {
  it('creates the settings on first read and counts rules and events beside them', async () => {
    await rateLimitService.createRule(ruleInput({ name: 'A' }));
    await rateLimitService.createRule(ruleInput({ name: 'B', enabled: false }));
    await event();
    const settings = await rateLimitService.getSettings();
    expect(settings).toMatchObject({ rule_count: 2, active_rule_count: 1, event_count: 1, store: 'MEMORY' });
    expect(settings.enabled).toBeDefined();
  });

  it('saves a change, drops the enforcer cache so it applies at once, and answers with the fresh settings', async () => {
    const out = await rateLimitService.updateSettings({ monitor_only: true, default_message: 'Calm down.' });
    expect(invalidateRateLimitCache).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ monitor_only: true, default_message: 'Calm down.' });
    expect((await rateLimitService.getSettings()).monitor_only).toBe(true);
  });
});

describe('rules', () => {
  it('creates a rule from the writable fields only, ignoring counters a client should never set', async () => {
    const doc = await rateLimitService.createRule({ ...ruleInput(), hit_count: 999, blocked_count: 999, _id: 'nope', unknown: 1 });
    expect(doc.name).toBe('Login');
    expect(doc.hit_count).toBe(0);
    expect(doc.blocked_count).toBe(0);
    expect(invalidateRateLimitCache).toHaveBeenCalledTimes(1);
    expect(await RateLimitRuleModel.countDocuments()).toBe(1);
  });

  it('lists rules by priority and reads one by id', async () => {
    const late = await rateLimitService.createRule(ruleInput({ name: 'Late', priority: 50 }));
    const early = await rateLimitService.createRule(ruleInput({ name: 'Early', priority: 1 }));
    expect((await rateLimitService.listRules()).map((r) => r.name)).toEqual(['Early', 'Late']);
    expect((await rateLimitService.getRule(String(early._id)))?.name).toBe('Early');
    expect(await rateLimitService.getRule(String(late._id).replace(/.$/, '0'))).toBeNull();
  });

  it('flushes the counters before a table read so hit counts are current', async () => {
    await rateLimitService.createRule(ruleInput());
    const page = await rateLimitService.rulesTable({ page: 1, page_size: 10 } as never);
    expect(flushRateLimitCounters).toHaveBeenCalledTimes(1);
    expect(page.total).toBe(1);
    expect(page.rows[0].name).toBe('Login');
    const none = await rateLimitService.rulesTable();
    expect(none.total).toBe(1);
  });

  it('updates a rule with the writable fields, and returns null for one that is gone', async () => {
    const doc = await rateLimitService.createRule(ruleInput());
    const updated = await rateLimitService.updateRule(String(doc._id), { limit: 99, hit_count: 5 });
    expect(updated).toMatchObject({ limit: 99, hit_count: 0 });
    await RateLimitRuleModel.deleteMany({});
    expect(await rateLimitService.updateRule(String(doc._id), { limit: 1 })).toBeNull();
    expect(invalidateRateLimitCache).toHaveBeenCalledTimes(3);
  });

  it('switches a rule off and on', async () => {
    const doc = await rateLimitService.createRule(ruleInput());
    expect((await rateLimitService.setRuleEnabled(String(doc._id), false))?.enabled).toBe(false);
    expect((await rateLimitService.setRuleEnabled(String(doc._id), true))?.enabled).toBe(true);
  });

  it('deletes a rule and answers true even when it was already gone', async () => {
    const doc = await rateLimitService.createRule(ruleInput());
    await expect(rateLimitService.deleteRule(String(doc._id))).resolves.toBe(true);
    await expect(rateLimitService.deleteRule(String(doc._id))).resolves.toBe(true);
    expect(await RateLimitRuleModel.countDocuments()).toBe(0);
  });

  it('resets a rule’s lifetime counters and timestamps without changing what it does', async () => {
    const doc = await rateLimitService.createRule(ruleInput());
    await RateLimitRuleModel.updateOne({ _id: doc._id }, { hit_count: 10, blocked_count: 4, last_blocked_at: new Date(), last_hit_at: new Date() });
    const reset = await rateLimitService.resetRuleCounters(String(doc._id));
    expect(reset).toMatchObject({ hit_count: 0, blocked_count: 0, limit: 5 });
    expect(reset?.last_blocked_at).toBeUndefined();
    expect(reset?.last_hit_at).toBeUndefined();
  });
});

describe('systems', () => {
  it('lists every system by traffic with how many enabled rules could govern it', async () => {
    await RateLimitSystemModel.create({ surface: 'MWEB', app: 'duncit', label: 'mWeb', requests: 50, blocked: 1 });
    await RateLimitSystemModel.create({ surface: 'PORTAL', app: 'tech', label: 'Tech', requests: 200, blocked: 0 });
    await rateLimitService.createRule(ruleInput({ name: 'Everywhere' }));
    await rateLimitService.createRule(ruleInput({ name: 'Tech only', surface: 'PORTAL', app: 'tech' }));
    await rateLimitService.createRule(ruleInput({ name: 'mWeb app only', surface: 'MWEB', app: 'duncit' }));
    await rateLimitService.createRule(ruleInput({ name: 'Elsewhere', surface: 'PORTAL', app: 'admin' }));
    await rateLimitService.createRule(ruleInput({ name: 'Off', enabled: false }));
    const rows = await rateLimitService.systems();
    expect(flushRateLimitCounters).toHaveBeenCalled();
    expect(rows.map((r) => [r.app, r.rule_count])).toEqual([['tech', 2], ['duncit', 2]]);
    expect(rows[0]).toMatchObject({ surface: 'PORTAL', requests: 200 });
  });
});

describe('events', () => {
  it('pages the breach log and clears it, reporting how many went', async () => {
    await event();
    await event({ ip: '2.2.2.2' });
    const page = await rateLimitService.eventsTable({ page: 1, page_size: 1 } as never);
    expect(page.total).toBe(2);
    expect(page.rows).toHaveLength(1);
    expect((await rateLimitService.eventsTable()).total).toBe(2);
    await expect(rateLimitService.clearEvents()).resolves.toBe(2);
    await expect(rateLimitService.clearEvents()).resolves.toBe(0);
  });

  it('sweeps events past the retention window and keeps the recent ones', async () => {
    await rateLimitService.updateSettings({ event_retention_days: 7 });
    const old = await event();
    await RateLimitEventModel.collection.updateOne({ _id: old._id }, { $set: { created_at: new Date(Date.now() - 8 * DAY) } });
    await event({ ip: '3.3.3.3' });
    await expect(rateLimitService.purgeOldEvents()).resolves.toBe(1);
    expect(await RateLimitEventModel.countDocuments()).toBe(1);
    await expect(rateLimitService.purgeOldEvents()).resolves.toBe(0);
  });
});

describe('stats', () => {
  it('summarises the last 24 hours: refused, monitored, and the top rules and systems', async () => {
    await event({ rule_name: 'Login' });
    await event({ rule_name: 'Login', ip: '2.2.2.2' });
    await event({ rule_name: 'Upload', mode: 'MONITOR', surface: 'PORTAL', app: 'tech' });
    const old = await event({ rule_name: 'Ancient' });
    await RateLimitEventModel.collection.updateOne({ _id: old._id }, { $set: { created_at: new Date(Date.now() - 2 * DAY) } });
    const out = await rateLimitService.stats();
    expect(flushRateLimitCounters).toHaveBeenCalled();
    expect(out).toEqual({
      store: 'MEMORY',
      blocked_24h: 2,
      monitored_24h: 1,
      top_rules: [{ label: 'Login', count: 2 }, { label: 'Upload', count: 1 }],
      top_systems: [{ label: 'MWEB / duncit', count: 2 }, { label: 'PORTAL / tech', count: 1 }],
    });
  });
});

describe('resetCounters', () => {
  it('wipes the live counters and the enforcer cache', async () => {
    await expect(rateLimitService.resetCounters()).resolves.toBe(true);
    expect(invalidateRateLimitCache).toHaveBeenCalledTimes(1);
    await resetAll();
  });
});

describe('options', () => {
  it('serves the vocabulary, the apps that have called and the roles', async () => {
    await RateLimitSystemModel.create({ surface: 'PORTAL', app: 'tech', label: 'Tech Portal' });
    await RateLimitSystemModel.create({ surface: 'MWEB', app: 'duncit', label: '' });
    const out = await rateLimitService.options();
    expect(out.surfaces).toContain('ADMIN_PORTAL');
    expect(out.channels).toEqual(['GRAPHQL', 'REST', 'SOCKET']);
    expect(out.key_by).toContain('IP_USER');
    expect(out.algorithms).toContain('TOKEN_BUCKET');
    expect(out.modes).toEqual(['ENFORCE', 'MONITOR']);
    expect(out.audiences).toEqual(['ALL', 'ANONYMOUS', 'AUTHENTICATED']);
    expect(out.operation_types).toContain('SUBSCRIPTION');
    expect(out.apps).toEqual([
      { surface: 'MWEB', app: 'duncit', label: 'duncit' },
      { surface: 'PORTAL', app: 'tech', label: 'Tech Portal' },
    ]);
    expect(out.roles).toEqual([{ key: 'SUPPORT', name: 'Support' }]);
  });
});
