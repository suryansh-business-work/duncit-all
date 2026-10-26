import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { DEFAULT_APP_ZONE, setAppTimeSettings } from '@utils/app-time';
import { McpToolCallModel, type ToolCallStatus } from '../../usage/usage.model';
import { recordToolCall, type ToolCallRecord } from '../../usage/usage.recorder';
import { mcpUsageService } from '../../usage/usage.service';

/**
 * The MCP activity log: one row per tool call (credentials redacted, tokens and
 * cost estimated), and the console's dashboard and Activity table over it —
 * everyone's for an MCP manager, only their own for everybody else.
 */

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const person = (email: string, roles: string[] = ['MCP_USER']): AuthUser => ({
  id: new Types.ObjectId().toHexString(),
  email,
  roles,
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('recordToolCall', () => {
  const asha = person('asha@duncit.com');

  const record = (over: Partial<ToolCallRecord> = {}): ToolCallRecord => ({
    user: asha,
    connectionId: new Types.ObjectId().toHexString(),
    clientName: 'Claude',
    userAgent: 'Claude-User/1.0',
    ip: '203.0.113.7',
    endpoint: 'pods',
    tool: 'pods_create_pod',
    category: 'pods',
    kind: 'MUTATION',
    risk: 'WRITE',
    reason: 'Create the reading circle the club asked for',
    args: { input: { pod_title: 'Reading circle' } },
    status: 'OK',
    errorCode: null,
    errorMessage: null,
    durationMs: 12.6,
    inputChars: 401,
    outputChars: 1000,
    injectionFlags: [],
    guardMode: 'block',
    settings: { token_price_input_per_million: 3, token_price_output_per_million: 15, currency: 'EUR' },
    ...over,
  });

  it('writes one row with who, which app, which tool, why, how it went and how long it took', async () => {
    const connectionId = new Types.ObjectId().toHexString();

    await recordToolCall(record({ connectionId }));

    const rows = await McpToolCallModel.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_email: 'asha@duncit.com',
      client_name: 'Claude',
      user_agent: 'Claude-User/1.0',
      ip: '203.0.113.7',
      endpoint: 'pods',
      tool: 'pods_create_pod',
      category: 'pods',
      kind: 'MUTATION',
      risk: 'WRITE',
      reason: 'Create the reading circle the club asked for',
      status: 'OK',
      error_code: null,
      error_message: null,
      duration_ms: 13,
      input_chars: 401,
      output_chars: 1000,
      guard_mode: 'block',
      injection_flags: [],
    });
    expect(String(rows[0].user_id)).toBe(asha.id);
    expect(String(rows[0].connection_id)).toBe(connectionId);
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });

  it('estimates tokens at four characters each and prices them at the settings’ rates', async () => {
    await recordToolCall(record({ inputChars: 401, outputChars: 1000 }));

    const row = await McpToolCallModel.findOne().orFail().lean();
    expect(row.input_tokens).toBe(101);
    expect(row.output_tokens).toBe(250);
    // (101 × 3 + 250 × 15) / 1,000,000
    expect(row.cost).toBeCloseTo(0.004053, 9);
    expect(row.currency).toBe('EUR');
  });

  it('costs nothing at zero prices, and never counts negative characters', async () => {
    await recordToolCall(
      record({
        inputChars: -5,
        outputChars: 3,
        settings: { token_price_input_per_million: 0, token_price_output_per_million: 0, currency: 'USD' },
      })
    );

    const row = await McpToolCallModel.findOne().orFail().lean();
    expect(row).toMatchObject({ input_tokens: 0, output_tokens: 1, cost: 0, currency: 'USD' });
  });

  it('stores the arguments with every credential replaced and long values cut', async () => {
    await recordToolCall(
      record({
        args: {
          input: {
            pod_title: 'Reading circle',
            pod_hashtag: ['books'],
            password: 'hunter2',
            nested: { api_key: 'sk-live-123', access_token: 'tok-456', note: 'x'.repeat(600) },
          },
          mcp_reason: 'Create the reading circle',
        },
      })
    );

    const row = await McpToolCallModel.findOne().orFail().lean();
    expect(row.args_preview).not.toContain('hunter2');
    expect(row.args_preview).not.toContain('sk-live-123');
    expect(row.args_preview).not.toContain('tok-456');
    expect(JSON.parse(row.args_preview)).toEqual({
      input: {
        pod_title: 'Reading circle',
        pod_hashtag: ['books'],
        password: '[redacted]',
        nested: { api_key: '[redacted]', access_token: '[redacted]', note: `${'x'.repeat(500)}… (+100 chars)` },
      },
      mcp_reason: 'Create the reading circle',
    });
  });

  it('keeps a refusal’s code, cuts its message at 1,000 characters, and records the injection flags', async () => {
    await recordToolCall(
      record({
        status: 'BLOCKED',
        errorCode: 'INJECTION_SUSPECTED',
        errorMessage: 'e'.repeat(1_500),
        injectionFlags: ['ignore_instructions@$.input.pod_description'],
        guardMode: 'warn',
      })
    );

    const row = await McpToolCallModel.findOne().orFail().lean();
    expect(row).toMatchObject({
      status: 'BLOCKED',
      error_code: 'INJECTION_SUSPECTED',
      injection_flags: ['ignore_instructions@$.input.pod_description'],
      guard_mode: 'warn',
    });
    expect(row.error_message).toBe('e'.repeat(1_000));
  });

  it('stores a connection id that is not an ObjectId as null rather than failing', async () => {
    await recordToolCall(record({ connectionId: 'not-an-id' }));

    expect((await McpToolCallModel.findOne().orFail().lean()).connection_id).toBeNull();
  });

  it('writes the log line without the arguments', async () => {
    const info = jest.spyOn(logs.server, 'info');

    await recordToolCall(record({ args: { input: { password: 'hunter2' } } }));

    expect(info).toHaveBeenCalledWith(
      'mcp',
      'toolCall',
      expect.objectContaining({ tool: 'pods_create_pod', status: 'OK', userId: asha.id, inputTokens: 101, outputTokens: 250 })
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain('hunter2');
  });

  it('never fails the call it describes: a row that cannot be written is logged and skipped', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);

    await expect(
      recordToolCall(record({ user: { id: 'definitely-not-an-object-id', email: null, roles: [] } }))
    ).resolves.toBeUndefined();

    expect(await McpToolCallModel.countDocuments()).toBe(0);
    expect(error).toHaveBeenCalledWith('mcp', 'recordToolCall', expect.objectContaining({ tool: 'pods_create_pod' }));
  });
});

/* ----------------------------------------------------------------------------
 * Dashboard and Activity table
 * ------------------------------------------------------------------------- */

interface Seed {
  user: AuthUser;
  tool: string;
  category: string;
  client: string;
  endpoint: string;
  status: ToolCallStatus;
  input: number;
  output: number;
  cost: number;
  ms: number;
  at: Date;
}

const toDoc = (seed: Seed) => ({
  user_id: new Types.ObjectId(seed.user.id),
  user_email: seed.user.email,
  connection_id: null,
  client_name: seed.client,
  endpoint: seed.endpoint,
  tool: seed.tool,
  category: seed.category,
  kind: 'QUERY',
  risk: 'READ',
  reason: null,
  args_preview: '{}',
  status: seed.status,
  duration_ms: seed.ms,
  input_chars: seed.input * 4,
  output_chars: seed.output * 4,
  input_tokens: seed.input,
  output_tokens: seed.output,
  cost: seed.cost,
  currency: 'USD',
  created_at: seed.at,
});

describe('mcpUsageService', () => {
  const asha = person('asha@duncit.com');
  const vikram = person('vikram@duncit.com');
  const manager = person('lead@duncit.com', ['MCP_MANAGER']);

  // Relative to today (the rows must stay inside the activity TTL), cut at a UTC midnight.
  const day = Math.floor((Date.now() - 10 * DAY) / DAY) * DAY;
  const dateKey = (offsetDays: number) => new Date(day + offsetDays * DAY).toISOString().slice(0, 10);
  const from = new Date(day - DAY).toISOString();
  const to = new Date(day + 3 * DAY).toISOString();

  const at = {
    a1: new Date(day + 10 * HOUR), // 15:30 in Kolkata, same date
    a2: new Date(day + 20 * HOUR), // 01:30 in Kolkata, NEXT date
    v1: new Date(day + DAY + 5 * HOUR),
    a3: new Date(day + 2 * DAY + 1 * HOUR),
    v2: new Date(day + 2 * DAY + 5 * HOUR),
    old: new Date(day - 25 * DAY), // outside the window, and older than the 30-day default
  };

  const ids: Record<string, string> = {};

  beforeEach(async () => {
    const seeds: Record<string, Seed> = {
      a1: { user: asha, tool: 'pods_create_pod', category: 'pods', client: 'Claude', endpoint: 'pods', status: 'OK', input: 100, output: 50, cost: 0.001, ms: 100, at: at.a1 },
      a2: { user: asha, tool: 'pods_pods_table', category: 'pods', client: 'Claude', endpoint: 'pods', status: 'ERROR', input: 20, output: 10, cost: 0.0002, ms: 300, at: at.a2 },
      a3: { user: asha, tool: 'mcp_whoami', category: 'mcp', client: 'Claude', endpoint: 'pods', status: 'INVALID', input: 5, output: 5, cost: 0, ms: 7, at: at.a3 },
      v1: { user: vikram, tool: 'finance_payments_table', category: 'finance', client: 'ChatGPT', endpoint: 'finance', status: 'BLOCKED', input: 30, output: 0, cost: 0, ms: 50, at: at.v1 },
      v2: { user: vikram, tool: 'pods_pods_table', category: 'pods', client: 'ChatGPT', endpoint: 'gateway', status: 'DENIED', input: 10, output: 0, cost: 0, ms: 10, at: at.v2 },
      old: { user: asha, tool: 'mcp_whoami', category: 'mcp', client: 'Claude', endpoint: 'pods', status: 'OK', input: 1, output: 1, cost: 0, ms: 1, at: at.old },
    };
    const keys = Object.keys(seeds);
    const docs = await McpToolCallModel.insertMany(keys.map((key) => toDoc(seeds[key])));
    keys.forEach((key, index) => {
      ids[key] = String(docs[index]._id);
    });
  });

  afterEach(() => {
    setAppTimeSettings({ time_zone: null });
  });

  const keyed = <T extends { key: string }>(buckets: T[]) => Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket]));
  const calls = <T extends { key: string; calls: number }>(buckets: T[]) =>
    Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket.calls]));

  describe('summary', () => {
    it('gives an MCP manager everyone’s totals and every breakdown, people included', async () => {
      const summary = await mcpUsageService.summary(manager, { from, to });

      expect(summary).toMatchObject({ scope: 'ALL', from, to, time_zone: DEFAULT_APP_ZONE });
      expect(summary.totals).toEqual({
        key: 'total',
        calls: 5,
        errors: 2, // ERROR and INVALID
        blocked: 2, // BLOCKED and DENIED
        users: 2,
        input_tokens: 165,
        output_tokens: 65,
        cost: 0.0012,
        avg_ms: 93, // (100 + 300 + 7 + 50 + 10) / 5, rounded
        last_at: at.v2.toISOString(),
      });
      expect(summary.by_tool[0]).toMatchObject({ key: 'pods_pods_table', calls: 2, errors: 1, blocked: 1, input_tokens: 30, avg_ms: 155 });
      expect(calls(summary.by_tool)).toEqual({ pods_pods_table: 2, pods_create_pod: 1, mcp_whoami: 1, finance_payments_table: 1 });
      expect(calls(summary.by_category)).toEqual({ pods: 3, mcp: 1, finance: 1 });
      expect(calls(summary.by_client)).toEqual({ Claude: 3, ChatGPT: 2 });
      expect(calls(summary.by_endpoint)).toEqual({ pods: 3, finance: 1, gateway: 1 });
      expect(calls(summary.by_status)).toEqual({ OK: 1, ERROR: 1, INVALID: 1, BLOCKED: 1, DENIED: 1 });
      expect(calls(summary.by_user)).toEqual({ 'asha@duncit.com': 3, 'vikram@duncit.com': 2 });
      expect(keyed(summary.by_user)['vikram@duncit.com']).toMatchObject({ blocked: 2, errors: 0, last_at: at.v2.toISOString() });
    });

    it('sorts the busiest buckets first', async () => {
      const summary = await mcpUsageService.summary(manager, { from, to });

      for (const list of [summary.by_tool, summary.by_category, summary.by_client, summary.by_endpoint, summary.by_user]) {
        const counts = list.map((bucket) => bucket.calls);
        expect(counts).toEqual([...counts].sort((a, b) => b - a));
      }
    });

    it('cuts days in the admin’s time zone, oldest first — a 20:00 UTC call is the next day in Kolkata', async () => {
      const summary = await mcpUsageService.summary(manager, { from, to });

      expect(summary.by_day.map((bucket) => [bucket.key, bucket.calls])).toEqual([
        [dateKey(0), 1],
        [dateKey(1), 2],
        [dateKey(2), 2],
      ]);
    });

    it('follows a change of the admin time zone', async () => {
      setAppTimeSettings({ time_zone: 'UTC' });

      const summary = await mcpUsageService.summary(manager, { from, to });

      expect(summary.time_zone).toBe('UTC');
      expect(summary.by_day.map((bucket) => [bucket.key, bucket.calls])).toEqual([
        [dateKey(0), 2],
        [dateKey(1), 1],
        [dateKey(2), 2],
      ]);
    });

    it('shows anyone else only their own calls, and no per-person breakdown', async () => {
      const summary = await mcpUsageService.summary(asha, { from, to });

      expect(summary.scope).toBe('MINE');
      expect(summary.totals).toMatchObject({ calls: 3, errors: 2, blocked: 0, users: 1, input_tokens: 125, output_tokens: 65, avg_ms: 136 });
      expect(calls(summary.by_client)).toEqual({ Claude: 3 });
      expect(summary.by_user).toEqual([]);
    });

    it('lets a member name themselves, but never somebody else (FORBIDDEN)', async () => {
      await expect(mcpUsageService.summary(asha, { from, to, user_id: asha.id })).resolves.toMatchObject({
        totals: { calls: 3 },
      });
      await expect(mcpUsageService.summary(asha, { from, to, user_id: vikram.id })).rejects.toMatchObject({
        extensions: { code: 'FORBIDDEN' },
      });
    });

    it('lets an MCP manager narrow to one person, and refuses an id that is not one', async () => {
      const one = await mcpUsageService.summary(manager, { from, to, user_id: vikram.id });

      expect(one.scope).toBe('ALL');
      expect(one.totals).toMatchObject({ calls: 2, users: 1 });
      expect(calls(one.by_user)).toEqual({ 'vikram@duncit.com': 2 });
      await expect(mcpUsageService.summary(manager, { from, to, user_id: 'nope' })).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });

    it('counts `from` in and `to` out', async () => {
      const exact = await mcpUsageService.summary(manager, { from: at.a1.toISOString(), to: at.v1.toISOString() });

      expect(calls(exact.by_tool)).toEqual({ pods_create_pod: 1, pods_pods_table: 1 });
    });

    it('answers zeros, not an error, for a window with no calls', async () => {
      const empty = await mcpUsageService.summary(manager, {
        from: new Date(day - 9 * DAY).toISOString(),
        to: new Date(day - 8 * DAY).toISOString(),
      });

      expect(empty.totals).toEqual({
        key: 'total',
        calls: 0,
        errors: 0,
        blocked: 0,
        users: 0,
        input_tokens: 0,
        output_tokens: 0,
        cost: 0,
        avg_ms: 0,
        last_at: null,
      });
      for (const list of [empty.by_tool, empty.by_day, empty.by_user, empty.by_status]) expect(list).toEqual([]);
    });

    it('defaults to the last 30 days', async () => {
      const before = Date.now();

      const summary = await mcpUsageService.summary(manager, {});

      const end = new Date(summary.to).getTime();
      expect(end).toBeGreaterThanOrEqual(before);
      expect(end - before).toBeLessThan(5_000);
      expect(end - new Date(summary.from).getTime()).toBe(30 * DAY);
      // a1…v2 are 8–11 days old; the 35-day-old row is not.
      expect(summary.totals.calls).toBe(5);
    });

    it('accepts a window of exactly 366 days and refuses one a millisecond longer', async () => {
      const end = new Date(day + 3 * DAY);

      await expect(
        mcpUsageService.summary(manager, { from: new Date(end.getTime() - 366 * DAY).toISOString(), to: end.toISOString() })
      ).resolves.toMatchObject({ totals: { calls: 6 } });
      await expect(
        mcpUsageService.summary(manager, { from: new Date(end.getTime() - 366 * DAY - 1).toISOString(), to: end.toISOString() })
      ).rejects.toMatchObject({ message: 'Choose a window of a year or less', extensions: { code: 'BAD_USER_INPUT' } });
    });

    it.each([
      ['an unreadable from', { from: 'last tuesday', to }, 'from is not a valid date'],
      ['an unreadable to', { from, to: '2026-13-45' }, 'to is not a valid date'],
      ['from equal to to', { from: to, to }, '`from` must be before `to`'],
      ['from after to', { from: to, to: from }, '`from` must be before `to`'],
    ])('refuses %s with BAD_USER_INPUT', async (_label, input, message) => {
      await expect(mcpUsageService.summary(manager, input)).rejects.toMatchObject({
        message,
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });
  });

  describe('table', () => {
    it('lists everyone’s calls for an MCP manager and only their own for anyone else, newest first', async () => {
      const all = await mcpUsageService.table(manager, { page_size: 50 });
      const mine = await mcpUsageService.table(asha, { page_size: 50 });

      expect(all.total).toBe(6);
      expect(mine.total).toBe(4);
      expect(mine.rows.map((row) => row.id)).toEqual([ids.a3, ids.a2, ids.a1, ids.old]);
      expect(mine.rows.every((row) => row.user_id === asha.id)).toBe(true);
    });

    it('filters and searches inside the owner scope, and a filter can never reach someone else’s rows', async () => {
      const errors = await mcpUsageService.table(asha, { filters: [{ field: 'status', op: 'eq', value: 'ERROR' }] });
      const whoami = await mcpUsageService.table(asha, { search: 'whoami' });
      const gateway = await mcpUsageService.table(manager, { filters: [{ field: 'endpoint', op: 'eq', value: 'gateway' }] });
      const widened = await mcpUsageService.table(asha, { filters: [{ field: 'user_email', op: 'eq', value: 'vikram@duncit.com' }] });

      expect(errors.rows.map((row) => row.id)).toEqual([ids.a2]);
      expect(whoami.rows.map((row) => row.id)).toEqual([ids.a3, ids.old]);
      expect(gateway.rows.map((row) => row.id)).toEqual([ids.v2]);
      expect(widened.total).toBe(0);
    });

    it('pages with the shared table contract', async () => {
      const page = await mcpUsageService.table(manager, { page: 2, page_size: 4 });

      expect(page).toMatchObject({ total: 6, page: 2, page_size: 4 });
      expect(page.rows).toHaveLength(2);
    });
  });

  describe('one', () => {
    it('reads one call — any call for a manager, only your own otherwise', async () => {
      await expect(mcpUsageService.one(manager, ids.v1)).resolves.toMatchObject({ id: ids.v1, tool: 'finance_payments_table' });
      await expect(mcpUsageService.one(asha, ids.v1)).resolves.toBeNull();
      await expect(mcpUsageService.one(asha, 'not-an-id')).resolves.toBeNull();

      await expect(mcpUsageService.one(asha, ids.a2)).resolves.toEqual({
        id: ids.a2,
        created_at: at.a2.toISOString(),
        user_id: asha.id,
        user_email: 'asha@duncit.com',
        connection_id: null,
        client_name: 'Claude',
        user_agent: null,
        ip: null,
        endpoint: 'pods',
        tool: 'pods_pods_table',
        category: 'pods',
        kind: 'QUERY',
        risk: 'READ',
        reason: null,
        args_preview: '{}',
        status: 'ERROR',
        error_code: null,
        error_message: null,
        duration_ms: 300,
        input_tokens: 20,
        output_tokens: 10,
        cost: 0.0002,
        currency: 'USD',
        injection_flags: [],
        guard_mode: 'block',
      });
    });
  });
});
