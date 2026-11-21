import { emailKey, phoneKey, websiteHost } from '@modules/crm/marketing/leads/marketingLead.keys';
import { escapeRegExp } from '@utils/regex';

/**
 * The values two CRM leads collide on — a contact phone, a contact email or the
 * website — and how each is compared. Pure: no database, so the rules are
 * tested on their own and shared by the live check, the save guard, the Excel
 * import and the listing's duplicate flag.
 *
 * Phone and email reuse the marketing lead keys (last ten digits; lowercase
 * address). A website is its host plus path, not the host alone: CRM leads
 * often use a social profile as their website, and every "instagram.com/…" lead
 * sharing one host would be a false duplicate.
 */

export const DUPLICATE_FIELDS = ['PHONE', 'EMAIL', 'WEBSITE'] as const;
export type DuplicateField = (typeof DUPLICATE_FIELDS)[number];

/** Fewer digits than this cannot identify a lead ("12345" is not a phone). */
const MIN_PHONE_DIGITS = 7;

/** One value to look for: what was typed and the key it compares by. */
export interface DuplicateProbe {
  field: DuplicateField;
  value: string;
  key: string;
}

/** The contact + website fields every lead kind stores. */
export interface LeadContactValues {
  contacts?: ReadonlyArray<{ mobile_number?: string | null; email?: string | null } | null> | null;
  website?: string | null;
}

/** The phone key, or '' when the number is too short to identify anyone. */
export function duplicatePhoneKey(raw: string | null | undefined): string {
  const key = phoneKey(String(raw ?? ''));
  return key.length >= MIN_PHONE_DIGITS ? key : '';
}

/** "https://www.Cafe.in/Menu/?utm=x" → "cafe.in/menu"; '' when it is not an address. */
export function websiteKey(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim();
  const host = websiteHost(text);
  if (!host) return '';
  const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  const path = url.pathname.replace(/\/+$/, '').toLowerCase();
  return `${host}${path}`;
}

export function keyOf(field: DuplicateField, raw: string | null | undefined): string {
  if (field === 'PHONE') return duplicatePhoneKey(raw);
  if (field === 'EMAIL') return emailKey(String(raw ?? ''));
  return websiteKey(raw);
}

/** Every distinct value on a lead worth checking, in the order the form shows them. */
export function probesFor(lead: LeadContactValues): DuplicateProbe[] {
  const raw: Array<[DuplicateField, string | null | undefined]> = [];
  for (const contact of lead.contacts ?? []) raw.push(['PHONE', contact?.mobile_number], ['EMAIL', contact?.email]);
  raw.push(['WEBSITE', lead.website]);
  const seen = new Set<string>();
  const probes: DuplicateProbe[] = [];
  for (const [field, value] of raw) {
    const key = keyOf(field, value);
    if (!key || seen.has(`${field}:${key}`)) continue;
    seen.add(`${field}:${key}`);
    probes.push({ field, value: String(value).trim(), key });
  }
  return probes;
}

/**
 * Stored values are whatever the operator typed ("+91 98765 43210",
 * "https://www.cafe.in/"), so the query matches by pattern: a phone's ten digits
 * with anything between them at the end of the number, and a website's host and
 * path behind an optional scheme / "www." with an optional trailing slash,
 * query or fragment. Both patterns are built from escaped digits and text only.
 */
export function phonePattern(key: string): RegExp {
  return new RegExp(`${key.split('').join(String.raw`\D*`)}\\D*$`);
}

export function websitePattern(key: string): RegExp {
  return new RegExp(String.raw`^(?:https?://)?(?:www\.)?${escapeRegExp(key)}/*(?:[?#].*)?$`, 'i');
}

/** The Mongo filter that finds any lead holding one of these values, or null when there is nothing to find. */
export function probeFilter(probes: readonly DuplicateProbe[]): Record<string, unknown> | null {
  const phones = probes.filter((p) => p.field === 'PHONE').map((p) => phonePattern(p.key));
  const emails = probes.filter((p) => p.field === 'EMAIL').map((p) => p.key);
  const websites = probes.filter((p) => p.field === 'WEBSITE').map((p) => websitePattern(p.key));
  const or: Record<string, unknown>[] = [];
  if (phones.length > 0) or.push({ 'contacts.mobile_number': { $in: phones } });
  if (emails.length > 0) or.push({ 'contacts.email': { $in: emails } });
  if (websites.length > 0) or.push({ website: { $in: websites } });
  return or.length === 0 ? null : { $or: or };
}

/** Which of the probes a stored lead actually holds (the query is a superset check; this is exact). */
export function probesHeldBy(lead: LeadContactValues, probes: readonly DuplicateProbe[]): DuplicateProbe[] {
  const held = new Set(probesFor(lead).map((p) => `${p.field}:${p.key}`));
  return probes.filter((p) => held.has(`${p.field}:${p.key}`));
}
