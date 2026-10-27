jest.mock('../../settings/settings.model', () => ({ McpSettingsModel: { findOneAndUpdate: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));

import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { McpSettingsModel } from '../../settings/settings.model';
import { mcpSettingsService } from '../../settings/settings.service';
import type { McpSettingsInput } from '../../settings/settings.types';

const findOneAndUpdate = McpSettingsModel.findOneAndUpdate as jest.Mock;
const warn = logs.server.warn as jest.Mock;

const ACTOR = '64b7f0c2a1e4c9d3f0a1b2c9';
const T0 = Date.parse('2026-10-26T10:00:00.000Z');

function doc(over: Record<string, unknown> = {}) {
  return {
    key: 'default',
    write_tools_enabled: true,
    default_injection_guard: 'block',
    disabled_tools: ['pods_pod'],
    disabled_categories: [],
    token_price_input_per_million: 3,
    token_price_output_per_million: 15,
    currency: 'USD',
    trusted_redirect_hosts: ['claude.ai', 'localhost'],
    allow_untrusted_clients: false,
    updated_by: new Types.ObjectId(ACTOR),
    updated_at: new Date('2026-10-01T09:00:00.000Z'),
    ...over,
  };
}

/** Each findOneAndUpdate(...).orFail() resolves to the next document given. */
function answers(...docs: Array<ReturnType<typeof doc> | Error>) {
  for (const next of docs) {
    findOneAndUpdate.mockImplementationOnce(() => ({ orFail: () => (next instanceof Error ? Promise.reject(next) : Promise.resolve(next)) }));
  }
}

let now = T0;
beforeEach(() => {
  findOneAndUpdate.mockReset();
  mcpSettingsService.clearCache();
  now = T0;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

async function failure(input: McpSettingsInput): Promise<GraphQLError> {
  const error = await mcpSettingsService.update(input, ACTOR).catch((caught: unknown) => caught);
  if (!(error instanceof GraphQLError)) throw new Error('expected a GraphQLError');
  return error;
}

describe('mcpSettingsService.get', () => {
  it('loads the one settings document, creating it with its defaults the first time', async () => {
    answers(doc());
    await mcpSettingsService.get();
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'default' },
      { $setOnInsert: { key: 'default' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  it('returns the settings as plain values', async () => {
    answers(doc());
    expect(await mcpSettingsService.get()).toEqual({
      write_tools_enabled: true,
      default_injection_guard: 'block',
      disabled_tools: ['pods_pod'],
      disabled_categories: [],
      token_price_input_per_million: 3,
      token_price_output_per_million: 15,
      currency: 'USD',
      trusted_redirect_hosts: ['claude.ai', 'localhost'],
      allow_untrusted_clients: false,
      updated_at: '2026-10-01T09:00:00.000Z',
      updated_by: ACTOR,
    });
  });

  it('reports a never-edited document as updated by nobody', async () => {
    answers(doc({ updated_by: null }));
    expect((await mcpSettingsService.get()).updated_by).toBeNull();
  });

  it('hands out copies, so a caller cannot change the cached lists', async () => {
    const source = doc();
    answers(source);
    const value = await mcpSettingsService.get();
    value.disabled_tools.push('pods_create_pod');
    expect(source.disabled_tools).toEqual(['pods_pod']);
  });

  it('serves the cached value for 15 seconds, then reads again', async () => {
    answers(doc(), doc({ write_tools_enabled: false }));
    await mcpSettingsService.get();
    now = T0 + 14_999;
    expect((await mcpSettingsService.get()).write_tools_enabled).toBe(true);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    now = T0 + 15_000;
    expect((await mcpSettingsService.get()).write_tools_enabled).toBe(false);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('reads again at once after clearCache', async () => {
    answers(doc(), doc({ currency: 'INR' }));
    await mcpSettingsService.get();
    mcpSettingsService.clearCache();
    expect((await mcpSettingsService.get()).currency).toBe('INR');
  });
});

describe('mcpSettingsService.update', () => {
  it('saves only the fields given, stamped with who changed them', async () => {
    answers(doc(), doc({ write_tools_enabled: false }));
    await mcpSettingsService.update({ write_tools_enabled: false }, ACTOR);
    expect(findOneAndUpdate).toHaveBeenLastCalledWith(
      { key: 'default' },
      { $set: { write_tools_enabled: false, updated_by: new Types.ObjectId(ACTOR) } },
      { new: true }
    );
  });

  it('returns the saved settings and serves them from the cache straight away', async () => {
    answers(doc(), doc({ write_tools_enabled: false }));
    const value = await mcpSettingsService.update({ write_tools_enabled: false }, ACTOR);
    expect(value.write_tools_enabled).toBe(false);
    expect((await mcpSettingsService.get()).write_tools_enabled).toBe(false);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('logs what changed, before and after, for exactly the changed fields', async () => {
    answers(doc(), doc({ default_injection_guard: 'warn', currency: 'INR' }));
    await mcpSettingsService.update({ default_injection_guard: 'warn', currency: 'INR' }, ACTOR);
    expect(warn).toHaveBeenCalledWith('mcp', 'settingsUpdated', {
      actorId: ACTOR,
      changed: ['default_injection_guard', 'currency'],
      before: { default_injection_guard: 'block', currency: 'USD' },
      after: { default_injection_guard: 'warn', currency: 'INR' },
    });
  });

  it('trims and lower-cases trusted hosts and accepts loopback, IPv6 and dotted names', async () => {
    answers(doc(), doc());
    await mcpSettingsService.update({ trusted_redirect_hosts: [' Claude.AI ', 'localhost', '[::1]', 'insiders.vscode.dev'] }, ACTOR);
    expect(findOneAndUpdate.mock.calls[1][1].$set.trusted_redirect_hosts).toEqual(['claude.ai', 'localhost', '[::1]', 'insiders.vscode.dev']);
  });

  it('passes on a missing settings document instead of inventing one', async () => {
    answers(doc(), new Error('No document found'));
    await expect(mcpSettingsService.update({ currency: 'EUR' }, ACTOR)).rejects.toThrow('No document found');
  });

  it.each<[string, McpSettingsInput, string]>([
    ['a switched-off tool that is not a tool name', { disabled_tools: ['Pods-Bad'] }, 'Not a tool name'],
    ['a three-letter code in lower case', { currency: 'usd' }, 'Use a three-letter currency code, e.g. USD'],
    ['an empty list of trusted hosts', { trusted_redirect_hosts: [] }, 'Keep at least one trusted host'],
    ['a URL where a host name belongs', { trusted_redirect_hosts: ['https://claude.ai'] }, 'Not a host name'],
    ['a host label starting with a hyphen', { trusted_redirect_hosts: ['-bad.example.com'] }, 'Not a host name'],
  ])('refuses %s', async (_label, input, message) => {
    const error = await failure(input);
    expect(error.extensions.code).toBe('BAD_USER_INPUT');
    expect(error.message).toBe(message);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each<[string, McpSettingsInput]>([
    ['a negative price', { token_price_input_per_million: -1 }],
    ['a price over the cap', { token_price_output_per_million: 100_001 }],
    ['a price that is not a number', { token_price_input_per_million: Number.NaN }],
    ['an unknown guard mode', { default_injection_guard: 'off' as never }],
    ['an unknown category', { disabled_categories: ['nowhere'] }],
  ])('refuses %s', async (_label, input) => {
    expect((await failure(input)).extensions.code).toBe('BAD_USER_INPUT');
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses a setting it does not know', async () => {
    const error = await failure({ allow_everything: true } as unknown as McpSettingsInput);
    expect(error.message).toContain('allow_everything');
  });

  it('reports every problem at once', async () => {
    const error = await failure({ currency: 'usd', trusted_redirect_hosts: [] });
    expect(error.message.split('; ')).toEqual(['Use a three-letter currency code, e.g. USD', 'Keep at least one trusted host']);
  });

  it('accepts the price boundaries 0 and 100,000', async () => {
    answers(doc(), doc());
    await mcpSettingsService.update({ token_price_input_per_million: 0, token_price_output_per_million: 100_000 }, ACTOR);
    expect(findOneAndUpdate.mock.calls[1][1].$set).toMatchObject({ token_price_input_per_million: 0, token_price_output_per_million: 100_000 });
  });
});
