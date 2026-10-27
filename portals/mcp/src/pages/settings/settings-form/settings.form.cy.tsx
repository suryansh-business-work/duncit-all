import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsForm from './settings.form';
import {
  isRedirectHost,
  makeSettingsSchema,
  SETTINGS_LIMITS,
  toSettingsInput,
  toSettingsValues,
  type SettingsFormValues,
} from './settings.types';
import type { SettingsData } from '../queries';

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const CURRENCIES = ['INR', 'USD'];
const schema = makeSettingsSchema(t, CURRENCIES);

const stored: SettingsData = {
  write_tools_enabled: true,
  default_injection_guard: 'block',
  disabled_tools: ['pods_delete_pod'],
  disabled_categories: ['finance'],
  token_price_input_per_million: 3,
  token_price_output_per_million: 15,
  currency: 'USD',
  trusted_redirect_hosts: ['claude.ai', 'localhost', '[::1]'],
  allow_untrusted_clients: false,
  updated_at: '2026-10-20T10:00:00.000Z',
  updated_by: null,
};

const values = (over: Partial<SettingsFormValues> = {}): SettingsFormValues => ({ ...toSettingsValues(stored), ...over });
const errorsOf = (input: SettingsFormValues) => {
  const result = schema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

describe('isRedirectHost', () => {
  it.each(['claude.ai', 'chat.openai.com', 'localhost', '127.0.0.1', '[::1]', 'insiders.vscode.dev'])('accepts %s', (host) => {
    expect(isRedirectHost(host)).toBe(true);
  });

  it.each(['claude ai', 'https://claude.ai', 'claude.ai:443', '-claude.ai', '[not-an-ip]', ''])('refuses %j', (host) => {
    expect(isRedirectHost(host)).toBe(false);
  });
});

describe('makeSettingsSchema', () => {
  it('accepts the stored settings as they are', () => {
    expect(errorsOf(values())).toEqual({});
  });

  it('reads prices as numbers and the currency in upper case', () => {
    const parsed = schema.parse(values({ token_price_input_per_million: ' 2.5 ', currency: 'inr' }));
    expect(parsed.token_price_input_per_million).toBe(2.5);
    expect(parsed.currency).toBe('INR');
  });

  it.each([[''], ['-1'], ['100001'], ['abc']])('refuses %j as a price', (price) => {
    const { min, max } = SETTINGS_LIMITS.price;
    expect(errorsOf(values({ token_price_output_per_million: price }))).toEqual({
      token_price_output_per_million: `mcp.settings.priceInvalid(${JSON.stringify({ min, max })})`,
    });
  });

  it('accepts both price bounds', () => {
    expect(errorsOf(values({ token_price_input_per_million: '0', token_price_output_per_million: '100000' }))).toEqual({});
  });

  it('refuses a currency the browser does not know', () => {
    expect(errorsOf(values({ currency: 'XYZ' }))).toEqual({ currency: 'mcp.settings.currencyInvalid' });
  });

  it('takes any three letters when the browser lists no currencies', () => {
    const open = makeSettingsSchema(t, []);
    expect(open.safeParse(values({ currency: 'xyz' })).success).toBe(true);
    expect(open.safeParse(values({ currency: 'XY' })).success).toBe(false);
  });

  it('keeps at least one trusted host', () => {
    expect(errorsOf(values({ trusted_redirect_hosts: [] }))).toEqual({ trusted_redirect_hosts: 'mcp.settings.hostsRequired' });
  });

  it('caps the trusted hosts and the switched-off tools at what the server keeps', () => {
    const hosts = Array.from({ length: SETTINGS_LIMITS.hosts.max + 1 }, (_, index) => `host${index}.example`);
    expect(errorsOf(values({ trusted_redirect_hosts: hosts }))).toEqual({
      trusted_redirect_hosts: `mcp.settings.hostsTooMany({"max":${SETTINGS_LIMITS.hosts.max}})`,
    });
    const tools = Array.from({ length: SETTINGS_LIMITS.tools + 1 }, (_, index) => `tool_${index}`);
    expect(errorsOf(values({ disabled_tools: tools }))).toEqual({
      disabled_tools: `mcp.settings.toolsTooMany({"max":${SETTINGS_LIMITS.tools}})`,
    });
  });

  it('names the host it refuses', () => {
    expect(errorsOf(values({ trusted_redirect_hosts: ['claude.ai', 'not a host'] }))).toEqual({
      trusted_redirect_hosts: 'mcp.settings.hostInvalid({"host":"not a host"})',
    });
  });

  it('refuses an unknown guard mode', () => {
    expect(schema.safeParse({ ...values(), default_injection_guard: 'ignore' }).success).toBe(false);
  });
});

describe('settings mappers', () => {
  it('puts prices in the form as text and hands numbers back', () => {
    expect(values().token_price_input_per_million).toBe('3');
    const input = toSettingsInput(schema.parse(values({ token_price_output_per_million: '12.75' })));
    expect(input.token_price_input_per_million).toBe(3);
    expect(input.token_price_output_per_million).toBe(12.75);
    expect(input.trusted_redirect_hosts).toEqual(['claude.ai', 'localhost', '[::1]']);
  });

  it('falls back to block for a guard mode the form does not offer', () => {
    expect(toSettingsValues({ ...stored, default_injection_guard: 'other' }).default_injection_guard).toBe('block');
  });
});

describe('SettingsForm', () => {
  const renderForm = (over: Partial<Parameters<typeof SettingsForm>[0]> = {}) => {
    const onSubmit = vi.fn();
    render(
      <SettingsForm
        settings={stored}
        categories={[
          { category: 'pods', label: 'Pods' },
          { category: 'finance', label: 'Finance' },
        ]}
        toolNames={['pods_delete_pod', 'pods_pods_table']}
        currencies={CURRENCIES}
        saving={false}
        errorMessage={null}
        onSubmit={onSubmit}
        {...over}
      />,
    );
    return onSubmit;
  };
  const submitted = async (onSubmit: ReturnType<typeof vi.fn>) => {
    fireEvent.click(screen.getByTestId('mcp-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    return onSubmit.mock.calls[0][0] as Record<string, unknown>;
  };
  const combobox = (name: RegExp) => screen.getByRole('combobox', { name });

  it('shows the saved categories by their names, not their keys', () => {
    renderForm();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('pods_delete_pod')).toBeInTheDocument();
  });

  it('submits the edited settings as the mutation input', async () => {
    const onSubmit = renderForm();
    fireEvent.click(screen.getByRole('switch', { name: /Allow write tools/ }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /Input price/ }), { target: { value: '4' } });
    expect(await submitted(onSubmit)).toMatchObject({
      write_tools_enabled: false,
      token_price_input_per_million: 4,
      token_price_output_per_million: 15,
      currency: 'USD',
      disabled_categories: ['finance'],
      allow_untrusted_clients: false,
    });
  });

  it('switches the default guard to warn', async () => {
    const onSubmit = renderForm();
    fireEvent.click(screen.getByRole('radio', { name: 'Warn' }));
    expect(await submitted(onSubmit)).toMatchObject({ default_injection_guard: 'warn' });
  });

  it('adds a typed host once, trimmed and in lower case', async () => {
    const onSubmit = renderForm();
    const hosts = combobox(/Trusted redirect hosts/);
    fireEvent.change(hosts, { target: { value: '  Chat.OpenAI.com ' } });
    fireEvent.keyDown(hosts, { key: 'Enter' });
    fireEvent.change(hosts, { target: { value: 'CHAT.openai.com' } });
    fireEvent.keyDown(hosts, { key: 'Enter' });
    expect(await submitted(onSubmit)).toMatchObject({
      trusted_redirect_hosts: ['claude.ai', 'localhost', '[::1]', 'chat.openai.com'],
    });
  });

  it('will not save a host that is not one, and names it', async () => {
    const onSubmit = renderForm();
    const hosts = combobox(/Trusted redirect hosts/);
    fireEvent.change(hosts, { target: { value: 'https://claude.ai' } });
    fireEvent.keyDown(hosts, { key: 'Enter' });
    fireEvent.click(screen.getByTestId('mcp-settings-save'));
    expect(await screen.findByText(/https:\/\/claude\.ai is not a host name/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('switches off another tool picked from the catalog', async () => {
    const onSubmit = renderForm();
    const tools = combobox(/Switched-off tools/);
    fireEvent.change(tools, { target: { value: 'pods_pods' } });
    fireEvent.click(await screen.findByRole('option', { name: 'pods_pods_table' }));
    expect(await submitted(onSubmit)).toMatchObject({ disabled_tools: ['pods_delete_pod', 'pods_pods_table'] });
  });

  it('prices tokens in another currency picked by its code', async () => {
    const onSubmit = renderForm();
    const currency = combobox(/Currency/);
    // An unfocused MUI Autocomplete resets typed text on its next render.
    fireEvent.focus(currency);
    fireEvent.mouseDown(currency);
    fireEvent.change(currency, { target: { value: 'IN' } });
    fireEvent.click(await screen.findByRole('option', { name: /^INR/ }));
    expect(await submitted(onSubmit)).toMatchObject({ currency: 'INR' });
  });

  it('takes a typed currency code when the browser cannot list currencies', async () => {
    const onSubmit = renderForm({ currencies: [] });
    fireEvent.change(combobox(/Currency/), { target: { value: 'eur' } });
    expect(await submitted(onSubmit)).toMatchObject({ currency: 'EUR' });
  });

  it('does not submit a price out of range', async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Output price/ }), { target: { value: '-5' } });
    fireEvent.click(screen.getByTestId('mcp-settings-save'));
    expect(await screen.findByText('Enter a price from 0 to 100000.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server refusal and the saving state', () => {
    renderForm({ saving: true, errorMessage: 'Keep at least one trusted host' });
    expect(screen.getByRole('alert')).toHaveTextContent('Keep at least one trusted host');
    expect(screen.getByTestId('mcp-settings-save')).toBeDisabled();
  });
});
