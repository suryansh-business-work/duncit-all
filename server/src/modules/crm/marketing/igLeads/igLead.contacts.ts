/**
 * Emails and phone numbers a business wrote into its own public text — the
 * Instagram bio and Google's snippet of the profile. Nothing is guessed or
 * looked up elsewhere: a lead without one simply has none.
 */
const MAX_EACH = 3;

/** Bounded character classes with no overlap between the parts, so no backtracking blow-up. */
const EMAIL = /[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,4}/g;
/** An Indian mobile, with or without +91 / 0 and the usual space or dash in the middle. */
const INDIAN_MOBILE = /(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}/g;

const unique = (values: string[]) => [...new Set(values)].slice(0, MAX_EACH);

export function extractEmails(text: string): string[] {
  return unique((text.match(EMAIL) ?? []).map((email) => email.toLowerCase().replace(/\.+$/, '')));
}

/** Stored as 91 + the ten digits, the form WhatsApp and the CRM take. */
export function extractPhones(text: string): string[] {
  return unique((text.match(INDIAN_MOBILE) ?? []).map((raw) => `91${raw.replaceAll(/\D/g, '').slice(-10)}`));
}
