jest.mock('../../usage/usage.model', () => ({ McpToolCallModel: { create: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { McpToolCallModel } from '../../usage/usage.model';
import { costOf, estimateTokens, recordToolCall, type ToolCallRecord } from '../../usage/usage.recorder';
import { settings, user } from './fixtures';

const create = McpToolCallModel.create as jest.Mock;
const info = logs.server.info as jest.Mock;
const logError = logs.server.error as jest.Mock;

const PRICES = { token_price_input_per_million: 3, token_price_output_per_million: 15, currency: 'USD' };
const USER_ID = '64b7f0c2a1e4c9d3f0a1b2c3';
const CONNECTION_ID = '64b7f0c2a1e4c9d3f0a1b2d4';

function call(over: Partial<ToolCallRecord> = {}): ToolCallRecord {
  return {
    user: user(['MCP_USER'], { id: USER_ID }),
    connectionId: CONNECTION_ID,
    clientName: 'Claude',
    userAgent: 'Claude-User/1.0',
    ip: '203.0.113.7',
    endpoint: 'pods',
    tool: 'pods_join_free_pod',
    category: 'pods',
    kind: 'MUTATION',
    risk: 'WRITE',
    reason: 'The member asked to join.',
    args: { pod_id: 'p1', password: 'hunter2' },
    status: 'OK',
    errorCode: null,
    errorMessage: null,
    durationMs: 12.6,
    inputChars: 1000,
    outputChars: 2000,
    injectionFlags: ['credential_request@$.note'],
    guardMode: 'block',
    settings: settings(PRICES),
    ...over,
  };
}

beforeEach(() => create.mockReset().mockResolvedValue({}));

describe('estimateTokens', () => {
  it.each([
    [0, 0],
    [1, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [1000, 250],
  ])('estimates %i characters as %i tokens (four characters a token, rounded up)', (chars, tokens) => {
    expect(estimateTokens(chars)).toBe(tokens);
  });

  it('never estimates a negative count', () => {
    expect(estimateTokens(-40)).toBe(0);
  });
});

describe('costOf', () => {
  it('prices input and output at their own per-million rates', () => {
    expect(costOf(1000, 2000, PRICES)).toBe(0.033);
    expect(costOf(250, 250, PRICES)).toBe(0.0045);
  });

  it('is free when nothing was used or the prices are zero', () => {
    expect(costOf(0, 0, PRICES)).toBe(0);
    expect(costOf(5000, 5000, { ...PRICES, token_price_input_per_million: 0, token_price_output_per_million: 0 })).toBe(0);
  });

  it('keeps six decimals, rounding half a millionth up and less than half down', () => {
    expect(costOf(1, 0, { ...PRICES, token_price_input_per_million: 0.6 })).toBe(0.000001);
    expect(costOf(1, 0, { ...PRICES, token_price_input_per_million: 0.4 })).toBe(0);
    expect(costOf(1_234_567, 7_654_321, { ...PRICES, token_price_input_per_million: 2.5, token_price_output_per_million: 10 })).toBe(79.629628);
  });
});

describe('recordToolCall', () => {
  it('writes one activity row with the estimate, the cost and the redacted arguments', async () => {
    await recordToolCall(call());
    expect(create).toHaveBeenCalledTimes(1);
    const row = create.mock.calls[0][0];
    expect(row).toEqual({
      user_id: new Types.ObjectId(USER_ID),
      user_email: 'asha@duncit.com',
      connection_id: new Types.ObjectId(CONNECTION_ID),
      client_name: 'Claude',
      user_agent: 'Claude-User/1.0',
      ip: '203.0.113.7',
      endpoint: 'pods',
      tool: 'pods_join_free_pod',
      category: 'pods',
      kind: 'MUTATION',
      risk: 'WRITE',
      reason: 'The member asked to join.',
      args_preview: '{"pod_id":"p1","password":"[redacted]"}',
      status: 'OK',
      error_code: null,
      error_message: null,
      duration_ms: 13,
      input_chars: 1000,
      output_chars: 2000,
      input_tokens: 250,
      output_tokens: 500,
      cost: 0.00825,
      currency: 'USD',
      injection_flags: ['credential_request@$.note'],
      guard_mode: 'block',
    });
  });

  it('stores no connection id when it is missing or not an ObjectId', async () => {
    await recordToolCall(call({ connectionId: null }));
    await recordToolCall(call({ connectionId: 'not-an-id' }));
    expect(create.mock.calls.map((args) => args[0].connection_id)).toEqual([null, null]);
  });

  it('stores a missing email as null', async () => {
    await recordToolCall(call({ user: user(['MCP_USER'], { id: USER_ID, email: undefined }) }));
    expect(create.mock.calls[0][0].user_email).toBeNull();
  });

  it('cuts a long error message to 1,000 characters', async () => {
    await recordToolCall(call({ status: 'ERROR', errorCode: 'INTERNAL', errorMessage: 'e'.repeat(1500) }));
    const row = create.mock.calls[0][0];
    expect(row.error_message).toHaveLength(1000);
    expect(row).toMatchObject({ status: 'ERROR', error_code: 'INTERNAL' });
  });

  it('stores a copy of the flags, not the caller’s array', async () => {
    const flags = ['a@$'];
    await recordToolCall(call({ injectionFlags: flags }));
    expect(create.mock.calls[0][0].injection_flags).toEqual(['a@$']);
    expect(create.mock.calls[0][0].injection_flags).not.toBe(flags);
  });

  it('logs the call for SigNoz without its arguments or reason', async () => {
    await recordToolCall(call());
    expect(info).toHaveBeenCalledWith('mcp', 'toolCall', {
      tool: 'pods_join_free_pod',
      endpoint: 'pods',
      status: 'OK',
      errorCode: null,
      durationMs: 12.6,
      userId: USER_ID,
      clientName: 'Claude',
      inputTokens: 250,
      outputTokens: 500,
    });
    expect(JSON.stringify(info.mock.calls[0])).not.toContain('hunter2');
  });

  it('never fails the call it describes when the database write fails, and logs why', async () => {
    const failure = new Error('write concern timeout');
    create.mockRejectedValue(failure);
    await expect(recordToolCall(call())).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith('mcp', 'recordToolCall', { error: failure, tool: 'pods_join_free_pod' });
  });

  it('swallows a row it cannot even build (a user id that is not an ObjectId) and logs it', async () => {
    await expect(recordToolCall(call({ user: user(['MCP_USER'], { id: 'not-an-object-id' }) }))).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('mcp', 'recordToolCall', expect.objectContaining({ tool: 'pods_join_free_pod' }));
  });
});
