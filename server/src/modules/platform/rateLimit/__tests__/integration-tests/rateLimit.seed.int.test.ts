import { RateLimitRuleModel } from '../../rateLimit.model';
import { seedRateLimitDefaults } from '../../rateLimit.seed';
import { limitKey, ruleMatches } from '../../rateLimit.match';
import type { RateLimitRequest } from '../../rateLimit.types';

/**
 * The shipped rate-limit rules, as a fresh database receives them — and the
 * one for event requests in particular: asking a host or venue for an event
 * messages its owner, so one account is capped across hosts and venues.
 */

const EVENT_RULE = 'Event requests';
const USER_ID = '65b000000000000000000042';

const loadEventRule = async () => {
  const rule = await RateLimitRuleModel.findOne({ name: EVENT_RULE });
  if (!rule) throw new Error('the event-request rule was not seeded');
  return rule;
};

const request = (over: Partial<RateLimitRequest> = {}): RateLimitRequest => ({
  channel: 'GRAPHQL',
  surface: 'MWEB',
  app: 'mweb',
  operation: 'requestEvent',
  fields: ['requestEvent'],
  operationType: 'MUTATION',
  ip: '203.0.113.7',
  userId: USER_ID,
  roles: ['USER'],
  ...over,
});

describe('seedRateLimitDefaults — the event request rule', () => {
  it('ships enforcing, per account, 20 different asks an hour, with a message the member can read', async () => {
    await seedRateLimitDefaults();

    const rule = await loadEventRule();
    expect(rule).toMatchObject({
      enabled: true,
      mode: 'ENFORCE',
      surface: 'ALL',
      app: '*',
      channel: 'GRAPHQL',
      operation_type: 'MUTATION',
      audience: 'AUTHENTICATED',
      key_by: 'USER',
      algorithm: 'SLIDING_WINDOW',
      limit: 20,
      window_seconds: 3600,
      block_seconds: 0,
      message: 'You have sent a lot of requests. Please try again later.',
    });
    expect([...rule.operations]).toEqual(['requestEvent']);
    expect([...rule.paths]).toEqual([]);
  });

  it('governs the requestEvent mutation of a signed-in member from any app, and keys it on the account', async () => {
    await seedRateLimitDefaults();
    const rule = await loadEventRule();

    expect(ruleMatches(rule, request())).toBe(true);
    expect(ruleMatches(rule, request({ surface: 'NATIVE', app: 'native' }))).toBe(true);
    // Batched with another field in one round trip still counts.
    expect(ruleMatches(rule, request({ operation: 'me', fields: ['me', 'requestEvent'] }))).toBe(true);
    expect(limitKey(rule, request())).toBe(`user:${USER_ID}`);
  });

  it('leaves every other operation, reads, REST and anonymous callers alone', async () => {
    await seedRateLimitDefaults();
    const rule = await loadEventRule();

    expect(ruleMatches(rule, request({ operation: 'joinFreePod', fields: ['joinFreePod'] }))).toBe(false);
    expect(ruleMatches(rule, request({ operationType: 'QUERY' }))).toBe(false);
    expect(ruleMatches(rule, request({ userId: undefined }))).toBe(false);
    expect(ruleMatches(rule, request({ channel: 'REST', path: '/requestEvent', method: 'POST' }))).toBe(false);
  });

  it('is created once: a re-seed adds no rows and keeps a limit an operator tuned', async () => {
    await seedRateLimitDefaults();
    const shipped = await RateLimitRuleModel.countDocuments();
    await RateLimitRuleModel.updateOne({ name: EVENT_RULE }, { $set: { limit: 5, mode: 'MONITOR' } });

    await seedRateLimitDefaults();

    expect(await RateLimitRuleModel.countDocuments()).toBe(shipped);
    expect(await RateLimitRuleModel.countDocuments({ name: EVENT_RULE })).toBe(1);
    expect(await loadEventRule()).toMatchObject({ limit: 5, mode: 'MONITOR' });
  });

  it('brings the rule back on the next boot of a server that never had it, without touching the others', async () => {
    await seedRateLimitDefaults();
    const shipped = await RateLimitRuleModel.countDocuments();
    await RateLimitRuleModel.deleteOne({ name: EVENT_RULE });

    await seedRateLimitDefaults();

    expect(await RateLimitRuleModel.countDocuments()).toBe(shipped);
    expect((await loadEventRule()).limit).toBe(20);
  });
});
