/**
 * The TWILIO environment entry as the app edits it — pure, so the screen and
 * the tests share one reading. Field names are the env registry's
 * (server/src/modules/platform/envEntry/env-registry.json › TWILIO).
 */

export const TWILIO_FIELDS = [
  'account_sid',
  'auth_token',
  'phone_number',
  'agent_phone_number',
] as const;
export type TwilioField = (typeof TWILIO_FIELDS)[number];
export type TwilioValues = Record<TwilioField, string>;

export interface TwilioEntry {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  config: readonly { key: string; value: string }[];
  secrets: readonly { key: string; present: boolean }[];
  last_test_ok?: boolean | null;
}

/** The entry the call line reads: the category's default, else an active one, else the first. */
export function pickTwilioEntry(entries: readonly TwilioEntry[] | undefined): TwilioEntry | null {
  if (!entries?.length) return null;
  return (
    entries.find((e) => e.is_default) ?? entries.find((e) => e.is_active) ?? entries[0] ?? null
  );
}

/**
 * The form's starting values. The auth token is never put back in the form:
 * it is write-only here, and a blank one on save keeps what is stored.
 */
export function twilioFormValues(entry: TwilioEntry | null): TwilioValues {
  const value = (key: TwilioField) => entry?.config.find((p) => p.key === key)?.value ?? '';
  return {
    account_sid: value('account_sid'),
    auth_token: '',
    phone_number: value('phone_number'),
    agent_phone_number: value('agent_phone_number'),
  };
}

/** Whether a token is already saved (so leaving the field blank keeps it). */
export const hasSavedToken = (entry: TwilioEntry | null): boolean =>
  Boolean(
    entry?.secrets.find((s) => s.key === 'has_auth_token' || s.key === 'auth_token')?.present,
  );

/**
 * The pairs to send. A blank token is left out, so the stored one stays (the
 * server never overwrites a secret with blank either); every other field is
 * sent as typed, trimmed, so clearing the optional agent number clears it.
 */
export function twilioConfigPairs(values: TwilioValues): { key: string; value: string }[] {
  return TWILIO_FIELDS.flatMap((key) => {
    const value = values[key].trim();
    if (key === 'auth_token' && !value) return [];
    return [{ key, value }];
  });
}
