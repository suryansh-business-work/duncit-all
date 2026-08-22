import type { EmailCategory } from '../email.provider';
import { CHROME_VARS, type EmailDef, type EmailVar } from './catalogue.types';
import { EXISTING_EMAILS } from './catalogue.existing';
import { USER_EMAILS } from './catalogue.user';
import { ONBOARDING_EMAILS } from './catalogue.onboarding';
import { CLUB_ADMIN_EMAILS, ECOMM_EMAILS, HOST_EMAILS, VENUE_EMAILS } from './catalogue.partners';
import { COMMERCE_EMAILS, SECURITY_EMAILS, SUPPORT_EMAILS } from './catalogue.support';

export * from './catalogue.types';
export * from './mjml';
export { FIELD, LABEL, CTA, FOOTER, HELP } from './catalogue.copy';
export { ONBOARDING_COPY_KEYS } from './catalogue.onboarding';

/**
 * Every email the product sends, in one list.
 *
 * The order is the order the Tech portal's docs table reads best in: what a
 * member gets, then each partner kind, then support, security and commerce, and
 * finally the ones that already shipped. Nothing downstream depends on it —
 * `emailTemplates` sorts by slug — so it is free to be the readable one.
 */
export const EMAIL_CATALOGUE: readonly EmailDef[] = [
  ...USER_EMAILS,
  ...ONBOARDING_EMAILS,
  ...HOST_EMAILS,
  ...VENUE_EMAILS,
  ...ECOMM_EMAILS,
  ...CLUB_ADMIN_EMAILS,
  ...SUPPORT_EMAILS,
  ...SECURITY_EMAILS,
  ...COMMERCE_EMAILS,
  ...EXISTING_EMAILS,
];

/**
 * Two rows claiming one slug is the failure this guards.
 *
 * It would not throw anywhere: the later row would win one map and lose
 * another, so a template could seed with one body and be documented with a
 * different one's variables. Thrown at module load rather than reported,
 * because there is no correct behaviour to fall back to.
 */
function indexBySlug(rows: readonly EmailDef[]): ReadonlyMap<string, EmailDef> {
  const map = new Map<string, EmailDef>();
  for (const row of rows) {
    if (map.has(row.slug)) throw new Error(`Duplicate email catalogue slug: ${row.slug}`);
    map.set(row.slug, row);
  }
  return map;
}

export const EMAIL_BY_SLUG = indexBySlug(EMAIL_CATALOGUE);

/**
 * The email a WhatsApp scenario also sends, by that scenario's event key.
 *
 * Only rows that declare `waEvent` are here, and only they can be reached by
 * `notifyEvent`'s email leg — which is how a template gets a send site without
 * one line of new plumbing at the call site.
 */
export const EMAIL_BY_WA_EVENT: ReadonlyMap<string, EmailDef> = new Map(
  EMAIL_CATALOGUE.filter((row) => row.waEvent).map((row) => [row.waEvent as string, row])
);

/** The rows that carry their own body, in the shape `seedDefaults` seeds from. */
export const CATALOGUE_TEMPLATE_DEFAULTS = EMAIL_CATALOGUE.filter((row) => row.mjml).map((row) => ({
  slug: row.slug,
  name: row.name,
  description: row.description,
  subject: row.subject,
  mjml: row.mjml as string,
}));

/** Which fragment wraps each catalogue row, by slug. */
export const CATALOGUE_CATEGORIES: Record<string, EmailCategory> = Object.fromEntries(
  EMAIL_CATALOGUE.map((row) => [row.slug, row.category])
);

/**
 * Each catalogue row's own footer sentence, by slug.
 *
 * Rows describing a template that already shipped carry an empty `footerNote`
 * on purpose: their sentence has lived in `TEMPLATE_FOOTER_NOTES` since the
 * fragment migration, and a blank entry here would overwrite it with nothing.
 */
export const CATALOGUE_FOOTER_NOTES: Record<string, string> = Object.fromEntries(
  EMAIL_CATALOGUE.filter((row) => row.footerNote).map((row) => [row.slug, row.footerNote])
);

/**
 * The variables each template fills — its own, then the ones every send
 * supplies. What `migrate:email-chrome` writes onto the stored rows so the Tech
 * portal can document and preview them.
 */
export const CATALOGUE_VARIABLES: Record<string, EmailVar[]> = Object.fromEntries(
  EMAIL_CATALOGUE.map((row) => [row.slug, [...row.vars, ...CHROME_VARS]])
);
