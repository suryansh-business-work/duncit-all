import { rateLimitResolvers } from '../../rateLimit.resolver';
import { rateLimitService } from '../../rateLimit.service';
import { makeContext } from '@test/harness';

jest.mock('../../rateLimit.service', () => ({
  rateLimitService: {
    getSettings: jest.fn(), updateSettings: jest.fn(), listRules: jest.fn(), rulesTable: jest.fn(), getRule: jest.fn(), createRule: jest.fn(),
    updateRule: jest.fn(), setRuleEnabled: jest.fn(), deleteRule: jest.fn(), resetRuleCounters: jest.fn(), systems: jest.fn(), eventsTable: jest.fn(),
    stats: jest.fn(), options: jest.fn(), resetCounters: jest.fn(), clearEvents: jest.fn(),
  },
}));

type Resolver = Record<string, (...args: any[]) => any>;
const Q = rateLimitResolvers.Query as Resolver;
const M = rateLimitResolvers.Mutation as Resolver;
const svc = rateLimitService as unknown as Record<string, jest.Mock>;

const tech = makeContext({ id: 't', roles: ['TECH_MANAGER'] });
const logsReader = makeContext({ id: 'l', roles: ['LOGS_MANAGER'] });
const outsider = makeContext({ id: 'o', roles: ['USER'] });

const doc = (over: Record<string, unknown> = {}) => ({ _id: 'r1', name: 'Login', updated_at: new Date('2026-01-02T03:04:05Z'), ...over });

describe('reads', () => {
  it('serves settings with their dates as ISO strings', async () => {
    svc.getSettings.mockResolvedValue({ enabled: true, updated_at: new Date('2026-01-02T03:04:05Z') });
    await expect(Q.rateLimitSettings({}, {}, tech)).resolves.toEqual({ enabled: true, updated_at: '2026-01-02T03:04:05.000Z' });
  });

  it('serves rules as plain objects with an id, and from a mongoose document too', async () => {
    svc.listRules.mockResolvedValue([doc(), { toObject: () => ({ _id: 'r2', name: 'B', created_at: new Date('2026-01-01T00:00:00Z') }) }]);
    await expect(Q.rateLimitRules({}, {}, tech)).resolves.toEqual([
      { _id: 'r1', name: 'Login', updated_at: '2026-01-02T03:04:05.000Z', id: 'r1' },
      { _id: 'r2', name: 'B', created_at: '2026-01-01T00:00:00.000Z', id: 'r2' },
    ]);
  });

  it('pages the rules', async () => {
    svc.rulesTable.mockResolvedValue({ total: 1, rows: [doc()] });
    await expect(Q.rateLimitRulesTable({}, { query: { page: 1 } }, tech)).resolves.toMatchObject({ total: 1, rows: [{ id: 'r1' }] });
    expect(svc.rulesTable).toHaveBeenCalledWith({ page: 1 });
  });

  it('returns one rule, or null when there is none', async () => {
    svc.getRule.mockResolvedValue(doc());
    await expect(Q.rateLimitRule({}, { rule_id: 'r1' }, tech)).resolves.toMatchObject({ id: 'r1' });
    svc.getRule.mockResolvedValue(null);
    await expect(Q.rateLimitRule({}, { rule_id: 'gone' }, tech)).resolves.toBeNull();
  });

  it('lets the Logs console read the breach log, stats and options but nothing else', async () => {
    svc.eventsTable.mockResolvedValue({ total: 0, rows: [] });
    await expect(Q.rateLimitEventsTable({}, {}, logsReader)).resolves.toEqual({ total: 0, rows: [] });
    svc.stats.mockResolvedValue({ blocked_24h: 1 });
    await expect(Q.rateLimitStats({}, {}, logsReader)).resolves.toEqual({ blocked_24h: 1 });
    svc.options.mockResolvedValue({ surfaces: [] });
    await expect(Q.rateLimitOptions({}, {}, logsReader)).resolves.toEqual({ surfaces: [] });
    await expect(Q.rateLimitSettings({}, {}, logsReader)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(() => Q.rateLimitStats({}, {}, outsider)).toThrow('Access Denied');
  });
});

describe('writes', () => {
  it('creates, updates, enables and resets rules, answering with the rule and its id', async () => {
    svc.createRule.mockResolvedValue(doc());
    await expect(M.createRateLimitRule({}, { input: { name: 'Login' } }, tech)).resolves.toMatchObject({ id: 'r1' });
    svc.updateRule.mockResolvedValue(doc({ name: 'Renamed' }));
    await expect(M.updateRateLimitRule({}, { rule_id: 'r1', input: { name: 'Renamed' } }, tech)).resolves.toMatchObject({ name: 'Renamed' });
    expect(svc.updateRule).toHaveBeenCalledWith('r1', { name: 'Renamed' });
    svc.setRuleEnabled.mockResolvedValue(doc({ enabled: false }));
    await expect(M.setRateLimitRuleEnabled({}, { rule_id: 'r1', enabled: false }, tech)).resolves.toMatchObject({ enabled: false });
    svc.resetRuleCounters.mockResolvedValue(doc({ hit_count: 0 }));
    await expect(M.resetRateLimitRuleCounters({}, { rule_id: 'r1' }, tech)).resolves.toMatchObject({ hit_count: 0 });
  });

  it.each([
    ['updateRateLimitRule', 'updateRule', { rule_id: 'x', input: {} }],
    ['setRateLimitRuleEnabled', 'setRuleEnabled', { rule_id: 'x', enabled: true }],
    ['resetRateLimitRuleCounters', 'resetRuleCounters', { rule_id: 'x' }],
  ])('%s says the rule was not found when there is none', async (mutation, method, args) => {
    svc[method].mockResolvedValue(null);
    await expect(M[mutation]({}, args, tech)).rejects.toMatchObject({ message: 'Rule not found', extensions: { code: 'NOT_FOUND' } });
  });

  it('deletes rules, updates settings and resets or clears the live data', async () => {
    svc.deleteRule.mockResolvedValue(true);
    await expect(M.deleteRateLimitRule({}, { rule_id: 'r1' }, tech)).resolves.toBe(true);
    svc.updateSettings.mockResolvedValue({ enabled: false, updated_at: new Date('2026-01-02T03:04:05Z') });
    await expect(M.updateRateLimitSettings({}, { input: { enabled: false } }, tech)).resolves.toEqual({ enabled: false, updated_at: '2026-01-02T03:04:05.000Z' });
    svc.resetCounters.mockResolvedValue(true);
    await expect(M.resetRateLimitCounters({}, {}, tech)).resolves.toBe(true);
    svc.clearEvents.mockResolvedValue(4);
    await expect(M.clearRateLimitEvents({}, {}, tech)).resolves.toBe(4);
  });

  it('refuses every write to anyone but Tech', async () => {
    const attempts: Array<() => unknown> = [
      () => M.createRateLimitRule({}, { input: {} }, logsReader),
      () => M.deleteRateLimitRule({}, { rule_id: 'r1' }, logsReader),
      () => M.resetRateLimitCounters({}, {}, logsReader),
      () => M.clearRateLimitEvents({}, {}, outsider),
    ];
    for (const attempt of attempts) await expect(Promise.resolve().then(attempt)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});
