/**
 * The limiter's decision, made on every request. Its caches, counters and
 * timers are module state, so each test loads a fresh copy of the module and
 * of the mocks it talks to.
 */
type Mocks = {
  enforcer: typeof import('../../rateLimit.enforcer');
  store: { consume: jest.Mock; block: jest.Mock; blockedFor: jest.Mock };
  model: {
    ruleFind: jest.Mock;
    ruleBulk: jest.Mock;
    systemBulk: jest.Mock;
    eventCreate: jest.Mock;
    settingsDoc: jest.Mock;
  };
  slackSend: jest.Mock;
  logs: { warn: jest.Mock; error: jest.Mock };
};

function load(): Mocks {
  jest.resetModules();
  const store = { consume: jest.fn(), block: jest.fn().mockResolvedValue(undefined), blockedFor: jest.fn().mockResolvedValue(0) };
  const model = {
    ruleFind: jest.fn(),
    ruleBulk: jest.fn().mockResolvedValue({}),
    systemBulk: jest.fn().mockResolvedValue({}),
    eventCreate: jest.fn().mockResolvedValue({}),
    settingsDoc: jest.fn(),
  };
  const slackSend = jest.fn().mockResolvedValue(undefined);
  const logs = { warn: jest.fn(), error: jest.fn() };
  jest.doMock('../../rateLimit.store', () => store);
  jest.doMock('../../rateLimit.model', () => ({
    RateLimitRuleModel: { find: model.ruleFind, bulkWrite: model.ruleBulk },
    RateLimitSystemModel: { bulkWrite: model.systemBulk },
    RateLimitEventModel: { create: model.eventCreate },
    getRateLimitSettingsDoc: model.settingsDoc,
  }));
  jest.doMock('@modules/platform/slack/slack.service', () => ({ slackService: { send: slackSend } }));
  jest.doMock('@observability/log', () => ({ logs: { server: logs } }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const enforcer = require('../../rateLimit.enforcer') as typeof import('../../rateLimit.enforcer');
  return { enforcer, store, model, slackSend, logs };
}

const settings = (over: Record<string, unknown> = {}) => ({
  enabled: true, monitor_only: false, allow_ips: [], block_ips: [], exempt_roles: [], default_message: 'Slow down.',
  log_blocks: false, notify_slack: false, send_headers: true, ...over,
});
const rule = (over: Record<string, unknown> = {}) => ({
  _id: 'r1', name: 'Login', enabled: true, mode: 'ENFORCE', channel: 'ALL', surface: 'ALL', app: '*', audience: 'ALL', operation_type: 'ALL',
  operations: [], paths: [], methods: [], key_by: 'IP', algorithm: 'FIXED_WINDOW', limit: 5, window_seconds: 60, burst: 0, block_seconds: 0,
  exempt_roles: [], exempt_ips: [], notify_slack: false, message: undefined, ...over,
});
const req = (over: Record<string, unknown> = {}) => ({
  channel: 'GRAPHQL', surface: 'MWEB', app: 'duncit', ip: '1.2.3.4', roles: [], operation: 'login', operationType: 'MUTATION', ...over,
}) as never;
const hit = (over: Record<string, unknown> = {}) => ({ exceeded: true, count: 6, resetSeconds: 42, ...over });
const ok = () => ({ exceeded: false, count: 1, resetSeconds: 60 });

const arrange = (m: Mocks, opts: { settings?: Record<string, unknown> | null; rules?: unknown[] } = {}) => {
  m.model.settingsDoc.mockResolvedValue(opts.settings === null ? null : settings(opts.settings));
  m.model.ruleFind.mockReturnValue({ sort: async () => opts.rules ?? [rule()] });
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => {
  jest.useRealTimers();
  jest.dontMock('../../rateLimit.store');
});

describe('evaluate: master switch and global lists', () => {
  it('allows everything, and still counts it, when the limiter is switched off', async () => {
    const m = load();
    arrange(m, { settings: { enabled: false } });
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
    expect(m.store.consume).not.toHaveBeenCalled();
    await m.enforcer.flushRateLimitCounters();
    expect(m.model.systemBulk.mock.calls[0][0][0].updateOne).toMatchObject({
      filter: { surface: 'MWEB', app: 'duncit' }, update: { $inc: { requests: 1, blocked: 0 } },
    });
  });

  it('allows when the settings cannot be read at all', async () => {
    const m = load();
    arrange(m, { settings: null });
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
  });

  it('lets an allow-listed address through before any rule', async () => {
    const m = load();
    arrange(m, { settings: { allow_ips: ['1.2.3.*'] } });
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
    expect(m.model.ruleFind).not.toHaveBeenCalled();
  });

  it('refuses a block-listed address for an hour with the configured message', async () => {
    const m = load();
    arrange(m, { settings: { block_ips: ['1.2.3.4'] } });
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({
      allowed: false, rule_name: 'Blocked address', message: 'Slow down.', retry_after: 3600, limit: 0, remaining: 0,
    });
    await m.enforcer.flushRateLimitCounters();
    expect(m.model.systemBulk.mock.calls[0][0][0].updateOne.update.$inc).toEqual({ requests: 1, blocked: 1 });
  });

  it('skips the global lists for a request with no address, and lets the allow list win over the block list', async () => {
    let m = load();
    arrange(m, { settings: { block_ips: ['*'] }, rules: [] });
    await expect(m.enforcer.evaluate(req({ ip: '' }))).resolves.toEqual({ allowed: true });
    m = load();
    arrange(m, { settings: { allow_ips: ['1.2.3.4'], block_ips: ['1.2.3.4'] } });
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
  });

  it('does not count a socket handshake as a request on its system', async () => {
    const m = load();
    arrange(m, { settings: { enabled: false } });
    await m.enforcer.evaluate(req({ channel: 'SOCKET' }));
    await m.enforcer.flushRateLimitCounters();
    expect(m.model.systemBulk).not.toHaveBeenCalled();
  });
});

describe('evaluate: rules', () => {
  it('allows a request no rule has anything to say about', async () => {
    const m = load();
    arrange(m, { rules: [rule({ channel: 'REST' })] });
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
    expect(m.store.consume).not.toHaveBeenCalled();
  });

  it('allows a request under its ceiling and counts the hit on the rule', async () => {
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(ok());
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
    expect(m.store.consume).toHaveBeenCalledWith({ key: 'r1:ip:1.2.3.4', algorithm: 'FIXED_WINDOW', limit: 5, windowSeconds: 60, burst: 0 });
    await m.enforcer.flushRateLimitCounters();
    const update = m.model.ruleBulk.mock.calls[0][0][0].updateOne;
    expect(update.filter).toEqual({ _id: 'r1' });
    expect(update.update.$inc).toEqual({ hit_count: 1, blocked_count: 0 });
    expect(Object.keys(update.update.$set)).toEqual(['last_hit_at']);
    expect(m.model.ruleBulk.mock.calls[0][1]).toEqual({ ordered: false });
  });

  it('refuses a request over the ceiling with the rule’s own message, or the default one', async () => {
    const m = load();
    arrange(m, { rules: [rule({ message: 'Too many logins' })] });
    m.store.consume.mockResolvedValue(hit());
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({
      allowed: false, rule_id: 'r1', rule_name: 'Login', message: 'Too many logins', limit: 5, remaining: 0, retry_after: 42,
    });
    const m2 = load();
    arrange(m2);
    m2.store.consume.mockResolvedValue(hit());
    expect(await m2.enforcer.evaluate(req())).toMatchObject({ allowed: false, message: 'Slow down.' });
  });

  it('records the breach on the rule, with the block time', async () => {
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req());
    await m.enforcer.flushRateLimitCounters();
    const update = m.model.ruleBulk.mock.calls[0][0][0].updateOne.update;
    expect(update.$inc).toEqual({ hit_count: 1, blocked_count: 1 });
    expect(update.$set.last_blocked_at).toBeInstanceOf(Date);
    expect(update.$set.last_hit_at).toBeInstanceOf(Date);
  });

  it('skips an exempt caller, and a rule that cannot key the request', async () => {
    let m = load();
    arrange(m, { rules: [rule({ exempt_roles: ['SUPPORT'] })] });
    await expect(m.enforcer.evaluate(req({ roles: ['SUPPORT'] }))).resolves.toEqual({ allowed: true });
    expect(m.store.consume).not.toHaveBeenCalled();
    m = load();
    arrange(m, { rules: [rule({ key_by: 'USER' })] });
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
    expect(m.store.consume).not.toHaveBeenCalled();
  });

  it('exempts the global roles from every rule', async () => {
    const m = load();
    arrange(m, { settings: { exempt_roles: ['SUPER_ADMIN'] } });
    await m.enforcer.evaluate(req({ roles: ['SUPER_ADMIN'] }));
    expect(m.store.consume).not.toHaveBeenCalled();
  });

  it('asks every matching rule and refuses on the first that is exceeded', async () => {
    const m = load();
    arrange(m, { rules: [rule({ _id: 'a', name: 'A' }), rule({ _id: 'b', name: 'B' }), rule({ _id: 'c', name: 'C' })] });
    m.store.consume.mockResolvedValueOnce(ok()).mockResolvedValueOnce(hit());
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: false, rule_name: 'B' });
    expect(m.store.consume).toHaveBeenCalledTimes(2);
  });

  it('keeps a client cooling off from an earlier breach out without spending its allowance', async () => {
    const m = load();
    arrange(m, { rules: [rule({ block_seconds: 300 })] });
    m.store.blockedFor.mockResolvedValue(120);
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: false, retry_after: 120, limit: 5 });
    expect(m.store.blockedFor).toHaveBeenCalledWith('r1:ip:1.2.3.4');
    expect(m.store.consume).not.toHaveBeenCalled();
    await m.enforcer.flushRateLimitCounters();
    expect(m.model.ruleBulk.mock.calls[0][0][0].updateOne.update.$inc).toEqual({ hit_count: 1, blocked_count: 1 });
  });

  it('does not look up a cooling-off period for a rule that has none', async () => {
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(ok());
    await m.enforcer.evaluate(req());
    expect(m.store.blockedFor).not.toHaveBeenCalled();
  });

  it('starts a cooling-off period on an enforced breach and tells the caller to wait that long', async () => {
    const m = load();
    arrange(m, { rules: [rule({ block_seconds: 300 })] });
    m.store.consume.mockResolvedValue(hit());
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: false, retry_after: 300 });
    expect(m.store.block).toHaveBeenCalledWith('r1:ip:1.2.3.4', 300);
  });

  it('logs a failure to start the cooling-off period without failing the request', async () => {
    const m = load();
    arrange(m, { rules: [rule({ block_seconds: 300 })] });
    m.store.consume.mockResolvedValue(hit());
    m.store.block.mockRejectedValue(new Error('redis down'));
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: false });
    await settle();
    expect(m.logs.warn).toHaveBeenCalledWith('rateLimit', 'block', { error: expect.any(Error) });
  });
});

describe('evaluate: monitor mode', () => {
  it('records the breach but lets a MONITOR rule’s request through, flagging it', async () => {
    const m = load();
    arrange(m, { rules: [rule({ mode: 'MONITOR', block_seconds: 300 })] });
    m.store.consume.mockResolvedValue(hit());
    expect(await m.enforcer.evaluate(req())).toEqual({ allowed: true, monitored: true, rule_id: 'r1', rule_name: 'Login' });
    expect(m.store.block).not.toHaveBeenCalled();
    await settle();
    expect(m.model.eventCreate.mock.calls[0][0]).toMatchObject({ mode: 'MONITOR', rule_id: 'r1' });
  });

  it('turns every rule into MONITOR when the master setting says monitor only', async () => {
    const m = load();
    arrange(m, { settings: { monitor_only: true }, rules: [rule({ block_seconds: 300 })] });
    m.store.consume.mockResolvedValue(hit());
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: true, monitored: true });
    m.store.blockedFor.mockResolvedValue(100);
    const cooling = await m.enforcer.evaluate(req({ ip: '9.9.9.9' }));
    expect(cooling).toMatchObject({ allowed: true });
  });

  it('prefers a real refusal later in the list over an earlier monitored breach', async () => {
    const m = load();
    arrange(m, { rules: [rule({ _id: 'a', mode: 'MONITOR' }), rule({ _id: 'b', name: 'B' })] });
    m.store.consume.mockResolvedValue(hit());
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: false, rule_name: 'B' });
  });

  it('keeps reporting a monitored breach when a later rule is merely under its ceiling', async () => {
    const m = load();
    arrange(m, { rules: [rule({ _id: 'a', mode: 'MONITOR' }), rule({ _id: 'b' })] });
    m.store.consume.mockResolvedValueOnce(hit()).mockResolvedValueOnce(ok());
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: true, monitored: true, rule_id: 'a' });
  });
});

describe('evaluate: reporting a breach', () => {
  it('logs a refusal as a warning only when the setting asks for it', async () => {
    let m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req());
    expect(m.logs.warn).not.toHaveBeenCalledWith('rateLimit', 'Login', expect.anything());

    m = load();
    arrange(m, { settings: { log_blocks: true } });
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req({ operation: undefined, path: '/upload' }));
    expect(m.logs.warn).toHaveBeenCalledWith('rateLimit', 'Login', {
      mode: 'ENFORCE', key: 'ip:1.2.3.4', surface: 'MWEB', app: 'duncit', channel: 'GRAPHQL', target: '/upload', count: 6, limit: 5,
    });
  });

  it('writes one event with everything the console shows, and only one per rule and caller per window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req(), { userAgent: 'UA', userEmail: 'a@b.com' });
    await m.enforcer.evaluate(req(), { userAgent: 'UA', userEmail: 'a@b.com' });
    await jest.advanceTimersByTimeAsync(0);
    expect(m.model.eventCreate).toHaveBeenCalledTimes(1);
    expect(m.model.eventCreate.mock.calls[0][0]).toEqual({
      rule_id: 'r1', rule_name: 'Login', mode: 'ENFORCE', surface: 'MWEB', app: 'duncit', channel: 'GRAPHQL', operation: 'login', path: undefined,
      method: undefined, limit_key: 'ip:1.2.3.4', key_by: 'IP', ip: '1.2.3.4', user_id: undefined, user_email: 'a@b.com', device_id: undefined,
      user_agent: 'UA', count: 6, limit: 5, retry_after: 42,
    });
    jest.setSystemTime(new Date('2026-01-01T00:00:11Z'));
    await m.enforcer.evaluate(req());
    await jest.advanceTimersByTimeAsync(0);
    expect(m.model.eventCreate).toHaveBeenCalledTimes(2);
  });

  it('forgets stale dedupe keys once thousands of distinct callers have been seen', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const m = load();
    arrange(m, { rules: [rule({ key_by: 'IP' })] });
    m.store.consume.mockResolvedValue(hit());
    for (let i = 0; i < 5001; i += 1) await m.enforcer.evaluate(req({ ip: `10.0.${Math.floor(i / 250)}.${i % 250}` }));
    await jest.advanceTimersByTimeAsync(0);
    expect(m.model.eventCreate).toHaveBeenCalledTimes(5001);
    jest.setSystemTime(new Date('2026-01-01T00:01:00Z'));
    await m.enforcer.evaluate(req({ ip: '99.99.99.99' }));
    await jest.advanceTimersByTimeAsync(0);
    expect(m.model.eventCreate).toHaveBeenCalledTimes(5002);
  });

  it('logs a failure to record the event without failing the request', async () => {
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(hit());
    m.model.eventCreate.mockRejectedValue(new Error('mongo down'));
    expect(await m.enforcer.evaluate(req())).toMatchObject({ allowed: false });
    await settle();
    expect(m.logs.warn).toHaveBeenCalledWith('rateLimit', 'recordEvent', { error: expect.any(Error) });
  });

  it('announces in Slack when the rule or the master setting asks, naming where it happened', async () => {
    let m = load();
    arrange(m, { rules: [rule({ notify_slack: true })] });
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req());
    await settle();
    expect(m.slackSend).toHaveBeenCalledWith({
      text: 'Rate limit hit — *Login* refused ip:1.2.3.4 on MWEB/duncit at `login` (limit 5/60s).',
    });

    m = load();
    arrange(m, { settings: { notify_slack: true } });
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req({ operation: undefined, path: '/upload' }));
    await settle();
    expect(m.slackSend.mock.calls[0][0].text).toContain('at `/upload`');
    await m.enforcer.evaluate(req({ operation: undefined, path: undefined, ip: '8.8.8.8' }));
    await settle();
    expect(m.slackSend.mock.calls[1][0].text).toContain('at `GRAPHQL`');
  });

  it('does not announce when nobody asked, and logs a failed announcement', async () => {
    let m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req());
    await settle();
    expect(m.slackSend).not.toHaveBeenCalled();

    m = load();
    arrange(m, { rules: [rule({ notify_slack: true })] });
    m.store.consume.mockResolvedValue(hit());
    m.slackSend.mockRejectedValue(new Error('slack down'));
    await m.enforcer.evaluate(req());
    await settle();
    expect(m.logs.warn).toHaveBeenCalledWith('rateLimit', 'announce', { error: expect.any(Error) });
  });
});

describe('evaluate: failures', () => {
  it('allows the request, and logs it, when the counter store breaks', async () => {
    const m = load();
    arrange(m);
    m.store.consume.mockRejectedValue(new Error('redis down'));
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
    expect(m.logs.error).toHaveBeenCalledWith('rateLimit', 'evaluate', { error: expect.any(Error) });
  });

  it('keeps the rules it had when reloading them fails', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(hit());
    await m.enforcer.evaluate(req());
    jest.setSystemTime(new Date('2026-01-01T00:01:00Z'));
    m.model.ruleFind.mockReturnValue({ sort: async () => { throw new Error('mongo down'); } });
    expect(await m.enforcer.evaluate(req({ ip: '7.7.7.7' }))).toMatchObject({ allowed: false });
    expect(m.logs.warn).toHaveBeenCalledWith('rateLimit', 'loadRules', { error: expect.any(Error) });
  });

  it('keeps the settings it had when reloading them fails', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(ok());
    await m.enforcer.evaluate(req());
    jest.setSystemTime(new Date('2026-01-01T00:01:00Z'));
    m.model.settingsDoc.mockRejectedValue(new Error('mongo down'));
    await expect(m.enforcer.evaluate(req())).resolves.toEqual({ allowed: true });
    expect(m.logs.warn).toHaveBeenCalledWith('rateLimit', 'loadSettings', { error: expect.any(Error) });
    expect(m.store.consume).toHaveBeenCalledTimes(2);
  });
});

describe('caches', () => {
  it('reads rules and settings once per fifteen seconds, and again right after an edit', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(ok());
    await m.enforcer.evaluate(req());
    await m.enforcer.evaluate(req());
    expect(m.model.ruleFind).toHaveBeenCalledTimes(1);
    expect(m.model.settingsDoc).toHaveBeenCalledTimes(1);
    jest.setSystemTime(new Date('2026-01-01T00:00:16Z'));
    await m.enforcer.evaluate(req());
    expect(m.model.ruleFind).toHaveBeenCalledTimes(2);
    m.enforcer.invalidateRateLimitCache();
    await m.enforcer.evaluate(req());
    expect(m.model.ruleFind).toHaveBeenCalledTimes(3);
    expect(m.model.settingsDoc).toHaveBeenCalledTimes(3);
  });

  it('asks only for enabled rules, in priority order', async () => {
    const m = load();
    arrange(m);
    m.store.consume.mockResolvedValue(ok());
    await m.enforcer.evaluate(req());
    expect(m.model.ruleFind).toHaveBeenCalledWith({ enabled: true });
  });
});

describe('counters and the flush timer', () => {
  it('flushes nothing when nothing was counted', async () => {
    const m = load();
    await m.enforcer.flushRateLimitCounters();
    expect(m.model.ruleBulk).not.toHaveBeenCalled();
    expect(m.model.systemBulk).not.toHaveBeenCalled();
  });

  it('adds up the traffic of each system, upserting its row with the app as the default label', async () => {
    const m = load();
    arrange(m, { settings: { enabled: false } });
    await m.enforcer.evaluate(req());
    await m.enforcer.evaluate(req());
    await m.enforcer.evaluate(req({ app: 'admin', surface: 'PORTAL' }));
    await m.enforcer.flushRateLimitCounters();
    const writes = m.model.systemBulk.mock.calls[0][0].map((w: any) => w.updateOne);
    expect(writes).toHaveLength(2);
    const mweb = writes.find((w: any) => w.filter.surface === 'MWEB');
    expect(mweb).toMatchObject({ filter: { surface: 'MWEB', app: 'duncit' }, upsert: true });
    expect(mweb.update.$inc).toEqual({ requests: 2, blocked: 0 });
    expect(mweb.update.$setOnInsert).toEqual({ label: 'duncit' });
    expect(mweb.update.$set.last_seen_at).toBeInstanceOf(Date);
    await m.enforcer.flushRateLimitCounters();
    expect(m.model.systemBulk).toHaveBeenCalledTimes(1);
  });

  it('flushes every thirty seconds once started, only starts one timer, and logs a failed flush', async () => {
    jest.useFakeTimers();
    const m = load();
    arrange(m, { settings: { enabled: false } });
    m.enforcer.startRateLimitFlush();
    m.enforcer.startRateLimitFlush();
    await m.enforcer.evaluate(req());
    await jest.advanceTimersByTimeAsync(30_000);
    expect(m.model.systemBulk).toHaveBeenCalledTimes(1);
    m.model.systemBulk.mockRejectedValue(new Error('mongo down'));
    await m.enforcer.evaluate(req());
    await jest.advanceTimersByTimeAsync(30_000);
    expect(m.logs.warn).toHaveBeenCalledWith('rateLimit', 'flush', { error: expect.any(Error) });
  });
});

describe('shouldSendHeaders', () => {
  it('follows the master setting and defaults to sending', async () => {
    let m = load();
    arrange(m, { settings: { send_headers: false } });
    await expect(m.enforcer.shouldSendHeaders()).resolves.toBe(false);
    m = load();
    arrange(m, { settings: { send_headers: true } });
    await expect(m.enforcer.shouldSendHeaders()).resolves.toBe(true);
    m = load();
    arrange(m, { settings: null });
    await expect(m.enforcer.shouldSendHeaders()).resolves.toBe(true);
  });
});
