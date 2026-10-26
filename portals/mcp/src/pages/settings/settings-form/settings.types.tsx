import { z } from 'zod';
import type { McpSettingsInput } from '@duncit/gql-types';
import { HOSTNAME_LABEL, isHostname } from '@duncit/regex';
import { GUARD_MODES } from '../../../lib/labels';
import type { SettingsData } from '../queries';

/** The bounds the server holds every write to (settings.service inputSchema). */
export const SETTINGS_LIMITS = {
  price: { min: 0, max: 100_000 },
  hosts: { min: 1, max: 200 },
  tools: 1000,
} as const;

export type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/**
 * A redirect host as the server accepts it: a DNS name of one label
 * (`localhost`) or more (`claude.ai`, `127.0.0.1`), or a bracketed IPv6
 * literal (`[::1]`). Names go through @duncit/regex; an IPv6 literal is checked
 * by the URL parser, since the regex package has no pattern for one yet.
 */
export function isRedirectHost(value: string): boolean {
  if (value.startsWith('[')) {
    try {
      return new URL(`http://${value}`).hostname === value;
    } catch {
      return false;
    }
  }
  return HOSTNAME_LABEL.test(value) || isHostname(value);
}

/** One host as it is stored: trimmed and lower case. */
export const normalizeHost = (value: string) => value.trim().toLowerCase();

const priceField = (t: Translate) => {
  const { min, max } = SETTINGS_LIMITS.price;
  const message = t('mcp.settings.priceInvalid', { vars: { min, max } });
  // Number('abc') is NaN, which z.number() refuses — with the same message.
  return z
    .string()
    .trim()
    .min(1, message)
    .transform(Number)
    .pipe(z.number({ error: message }).min(min, message).max(max, message));
};

/**
 * The Settings form's rules — the server's, so a value it would refuse is
 * caught here first. `currencies` is the browser's ISO 4217 list; when the
 * browser cannot give one, any three letters pass and the server decides.
 */
export const makeSettingsSchema = (t: Translate, currencies: readonly string[]) =>
  z.object({
    write_tools_enabled: z.boolean(),
    default_injection_guard: z.enum(GUARD_MODES),
    disabled_categories: z.array(z.string()),
    disabled_tools: z
      .array(z.string())
      .max(SETTINGS_LIMITS.tools, t('mcp.settings.toolsTooMany', { vars: { max: SETTINGS_LIMITS.tools } })),
    token_price_input_per_million: priceField(t),
    token_price_output_per_million: priceField(t),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (code) => (currencies.length === 0 ? code.length === 3 : currencies.includes(code)),
        t('mcp.settings.currencyInvalid'),
      ),
    trusted_redirect_hosts: z
      .array(z.string())
      .min(SETTINGS_LIMITS.hosts.min, t('mcp.settings.hostsRequired'))
      .max(SETTINGS_LIMITS.hosts.max, t('mcp.settings.hostsTooMany', { vars: { max: SETTINGS_LIMITS.hosts.max } }))
      .superRefine((hosts, ctx) => {
        const bad = hosts.find((host) => !isRedirectHost(host));
        if (bad) ctx.addIssue({ code: 'custom', message: t('mcp.settings.hostInvalid', { vars: { host: bad } }) });
      }),
    allow_untrusted_clients: z.boolean(),
  });

export type SettingsFormValues = z.input<ReturnType<typeof makeSettingsSchema>>;
export type SettingsFormOutput = z.output<ReturnType<typeof makeSettingsSchema>>;

/** The stored settings as the form edits them (prices as typed text). */
export function toSettingsValues(settings: SettingsData): SettingsFormValues {
  return {
    write_tools_enabled: settings.write_tools_enabled,
    default_injection_guard: GUARD_MODES.find((mode) => mode === settings.default_injection_guard) ?? 'block',
    disabled_categories: [...settings.disabled_categories],
    disabled_tools: [...settings.disabled_tools],
    token_price_input_per_million: String(settings.token_price_input_per_million),
    token_price_output_per_million: String(settings.token_price_output_per_million),
    currency: settings.currency,
    trusted_redirect_hosts: [...settings.trusted_redirect_hosts],
    allow_untrusted_clients: settings.allow_untrusted_clients,
  };
}

/** The checked form as the mutation takes it. Every field is sent, so the save is the whole page. */
export function toSettingsInput(values: SettingsFormOutput): McpSettingsInput {
  return { ...values };
}
