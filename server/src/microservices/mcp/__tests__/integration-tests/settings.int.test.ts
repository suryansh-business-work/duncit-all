import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { mcpSettingsService } from '../../settings/settings.service';
import { DEFAULT_TRUSTED_REDIRECT_HOSTS, McpSettingsModel } from '../../settings/settings.model';
import type { McpSettingsInput } from '../../settings/settings.types';

/**
 * The MCP Settings document: kill switches, guard default, prices and trusted
 * hosts. Read on every tool call (cached for 15 s per process), written only
 * from the console by an MCP manager.
 */

const newActor = () => new Types.ObjectId().toHexString();
const storedDoc = () => McpSettingsModel.findOne({ key: 'default' }).lean();

beforeEach(() => {
  mcpSettingsService.clearCache();
});

afterEach(() => {
  jest.restoreAllMocks();
  mcpSettingsService.clearCache();
});

describe('mcpSettingsService.get — the seed', () => {
  it('creates the one settings document with its defaults the first time it is asked for', async () => {
    expect(await McpSettingsModel.countDocuments()).toBe(0);

    const settings = await mcpSettingsService.get();

    expect(settings).toEqual({
      write_tools_enabled: true,
      default_injection_guard: 'block',
      disabled_tools: [],
      disabled_categories: [],
      token_price_input_per_million: 0,
      token_price_output_per_million: 0,
      currency: 'USD',
      trusted_redirect_hosts: DEFAULT_TRUSTED_REDIRECT_HOSTS,
      allow_untrusted_clients: false,
      updated_at: expect.any(String),
      updated_by: null,
    });
    expect(new Date(settings.updated_at ?? '').toISOString()).toBe(settings.updated_at);
    expect(settings.trusted_redirect_hosts).toEqual(
      expect.arrayContaining(['claude.ai', 'chatgpt.com', 'localhost', '127.0.0.1', '[::1]'])
    );
    expect(await McpSettingsModel.countDocuments()).toBe(1);
  });

  it('never creates a second document, however often the cache is cold, and keeps what was saved', async () => {
    await mcpSettingsService.get();
    await McpSettingsModel.updateOne({ key: 'default' }, { $set: { currency: 'INR' } });
    mcpSettingsService.clearCache();
    const second = await mcpSettingsService.get();
    mcpSettingsService.clearCache();
    await mcpSettingsService.get();

    // The seed is $setOnInsert: a later read never resets a saved value.
    expect(second.currency).toBe('INR');
    expect(await McpSettingsModel.countDocuments()).toBe(1);
  });
});

describe('mcpSettingsService.update — what an MCP manager may set', () => {
  it('stores every field, normalises host names and names the manager who saved', async () => {
    const actor = newActor();

    const saved = await mcpSettingsService.update(
      {
        write_tools_enabled: false,
        default_injection_guard: 'warn',
        disabled_tools: ['pods_delete_pod', 'finance_refund_payment'],
        disabled_categories: ['finance', 'tech'],
        token_price_input_per_million: 3,
        token_price_output_per_million: 15.5,
        currency: 'EUR',
        trusted_redirect_hosts: ['  Claude.AI ', 'gemini.google.com'],
        allow_untrusted_clients: true,
      },
      actor
    );

    expect(saved).toMatchObject({
      write_tools_enabled: false,
      default_injection_guard: 'warn',
      disabled_tools: ['pods_delete_pod', 'finance_refund_payment'],
      disabled_categories: ['finance', 'tech'],
      token_price_input_per_million: 3,
      token_price_output_per_million: 15.5,
      currency: 'EUR',
      trusted_redirect_hosts: ['claude.ai', 'gemini.google.com'],
      allow_untrusted_clients: true,
      updated_by: actor,
    });
    const doc = await storedDoc();
    expect(String(doc?.updated_by)).toBe(actor);
    expect(doc?.trusted_redirect_hosts).toEqual(['claude.ai', 'gemini.google.com']);
    expect(doc?.currency).toBe('EUR');
  });

  it('changes only the fields it is given', async () => {
    await mcpSettingsService.update({ currency: 'INR' }, newActor());

    const settings = await mcpSettingsService.get();
    expect(settings.currency).toBe('INR');
    expect(settings.write_tools_enabled).toBe(true);
    expect(settings.default_injection_guard).toBe('block');
    expect(settings.trusted_redirect_hosts).toEqual(DEFAULT_TRUSTED_REDIRECT_HOSTS);
  });

  it('accepts the exact boundaries: free and 100,000 per million, a 64-character tool name, an IPv6 loopback host', async () => {
    const saved = await mcpSettingsService.update(
      {
        token_price_input_per_million: 0,
        token_price_output_per_million: 100_000,
        disabled_tools: ['a'.repeat(64)],
        trusted_redirect_hosts: ['[::1]'],
      },
      newActor()
    );

    expect(saved.token_price_input_per_million).toBe(0);
    expect(saved.token_price_output_per_million).toBe(100_000);
    expect(saved.disabled_tools).toEqual(['a'.repeat(64)]);
    expect(saved.trusted_redirect_hosts).toEqual(['[::1]']);
  });

  it('logs who changed which setting from what to what (the audit line)', async () => {
    const warn = jest.spyOn(logs.server, 'warn');
    const actor = newActor();

    await mcpSettingsService.update({ write_tools_enabled: false, currency: 'GBP' }, actor);

    expect(warn).toHaveBeenCalledWith('mcp', 'settingsUpdated', {
      actorId: actor,
      changed: ['write_tools_enabled', 'currency'],
      before: { write_tools_enabled: true, currency: 'USD' },
      after: { write_tools_enabled: false, currency: 'GBP' },
    });
  });

  const refused: Array<[string, Record<string, unknown>, RegExp]> = [
    ['a tool name with capitals or dashes', { disabled_tools: ['Pods-Create'] }, /Not a tool name/],
    ['a tool name one character too long', { disabled_tools: ['a'.repeat(65)] }, /Not a tool name/],
    ['an unknown category', { disabled_categories: ['payments'] }, /./],
    ['a negative input price', { token_price_input_per_million: -0.01 }, /./],
    ['an output price above 100,000', { token_price_output_per_million: 100_000.01 }, /./],
    ['a price that is not a number', { token_price_input_per_million: Number.NaN }, /./],
    ['a lower-case currency', { currency: 'usd' }, /three-letter currency code/],
    ['a four-letter currency', { currency: 'USDT' }, /three-letter currency code/],
    ['a URL where a host belongs', { trusted_redirect_hosts: ['https://claude.ai'] }, /Not a host name/],
    ['an empty trusted host list', { trusted_redirect_hosts: [] }, /Keep at least one trusted host/],
    ['a guard mode that does not exist', { default_injection_guard: 'off' }, /./],
    ['a key the settings do not have', { kill_everything: true }, /./],
  ];

  it.each(refused)('refuses %s with BAD_USER_INPUT and writes nothing', async (_label, input, message) => {
    await expect(mcpSettingsService.update(input as McpSettingsInput, newActor())).rejects.toMatchObject({
      message: expect.stringMatching(message),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await McpSettingsModel.countDocuments()).toBe(0);
  });

  it('a refused update leaves an existing document exactly as it was', async () => {
    const actor = newActor();
    await mcpSettingsService.update({ currency: 'EUR' }, actor);

    await expect(
      mcpSettingsService.update({ currency: 'JPY', trusted_redirect_hosts: [] }, newActor())
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });

    const doc = await storedDoc();
    expect(doc?.currency).toBe('EUR');
    expect(String(doc?.updated_by)).toBe(actor);
  });

  it('reports every problem at once, separated by semicolons', async () => {
    await expect(
      mcpSettingsService.update({ currency: 'usd', trusted_redirect_hosts: [] }, newActor())
    ).rejects.toThrow(/three-letter currency code.*; .*Keep at least one trusted host|Keep at least one trusted host.*; .*three-letter currency code/);
  });
});

describe('mcpSettingsService cache', () => {
  it('serves the cached value for 15 seconds, then reads the document again', async () => {
    const t0 = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(t0);
    expect((await mcpSettingsService.get()).currency).toBe('USD');

    // Another process (or a script) changes the document behind this one's back.
    await McpSettingsModel.updateOne({ key: 'default' }, { $set: { currency: 'GBP' } });

    clock.mockReturnValue(t0 + 14_999);
    expect((await mcpSettingsService.get()).currency).toBe('USD');

    clock.mockReturnValue(t0 + 15_000);
    expect((await mcpSettingsService.get()).currency).toBe('GBP');
  });

  it('an update reaches this process at once, replacing the cache rather than waiting out the window', async () => {
    expect((await mcpSettingsService.get()).write_tools_enabled).toBe(true);

    await mcpSettingsService.update({ write_tools_enabled: false }, newActor());
    // A change behind the service's back after the update is NOT visible: the
    // value served is the one the update just put in the cache.
    await McpSettingsModel.updateOne({ key: 'default' }, { $set: { write_tools_enabled: true } });

    expect((await mcpSettingsService.get()).write_tools_enabled).toBe(false);
  });

  it('clearCache makes the next read go to the document', async () => {
    await mcpSettingsService.get();
    await McpSettingsModel.updateOne({ key: 'default' }, { $set: { default_injection_guard: 'warn' } });

    mcpSettingsService.clearCache();

    expect((await mcpSettingsService.get()).default_injection_guard).toBe('warn');
  });
});
