import type { TranslateOptions } from './translator';

/**
 * The eight WhatsApp categories, named and explained in the reader's language.
 *
 * Every key is written out as a literal `t('…')` call rather than composed from
 * a namespace and the category the server sent. Two reasons, and both matter:
 *  - `scripts/verify-translation-keys.mjs` greps source for the literal key, so
 *    a computed key is reported as shipped-but-never-rendered and fails the
 *    Shared Gates job;
 *  - a typo in a computed key fails silently at runtime as the key itself
 *    printed on screen, while a literal one is greppable.
 *
 * It lives here, once, because three surfaces render the same eight names —
 * mWeb and the native app on WhatsApp Preference (rule 27), and the Admin
 * console on every scenario row (rules 34/40). "Activity" and "Notifications"
 * meaning the same category on two screens is a support ticket waiting to
 * happen.
 *
 * The types mirror `mail-preference.ts` rather than importing from it: both are
 * structural one-liners, and neither module should have to depend on the other
 * to name the `t` its caller already has.
 */

/** The `t` any surface hands in. Structural, so no surface owns this module. */
export type WaCategoryTranslate = (key: string, options?: TranslateOptions) => string;

export interface WaCategoryCopy {
  label: string;
  description: string;
}

/**
 * Built per category rather than all eight at once: a preference row asks for
 * one, and the admin scenario table asks per cell.
 */
const COPY: Record<string, (t: WaCategoryTranslate) => WaCategoryCopy> = {
  transactional: (t) => ({
    label: t('whatsappPreference.categories.transactional.label'),
    description: t('whatsappPreference.categories.transactional.description'),
  }),
  billing: (t) => ({
    label: t('whatsappPreference.categories.billing.label'),
    description: t('whatsappPreference.categories.billing.description'),
  }),
  account: (t) => ({
    label: t('whatsappPreference.categories.account.label'),
    description: t('whatsappPreference.categories.account.description'),
  }),
  notification: (t) => ({
    label: t('whatsappPreference.categories.notification.label'),
    description: t('whatsappPreference.categories.notification.description'),
  }),
  reminder: (t) => ({
    label: t('whatsappPreference.categories.reminder.label'),
    description: t('whatsappPreference.categories.reminder.description'),
  }),
  feedback: (t) => ({
    label: t('whatsappPreference.categories.feedback.label'),
    description: t('whatsappPreference.categories.feedback.description'),
  }),
  marketing: (t) => ({
    label: t('whatsappPreference.categories.marketing.label'),
    description: t('whatsappPreference.categories.marketing.description'),
  }),
  support: (t) => ({
    label: t('whatsappPreference.categories.support.label'),
    description: t('whatsappPreference.categories.support.description'),
  }),
};

/**
 * What one category is called, and what it means.
 *
 * A category this bundle has no copy for yet is a server that wired a ninth one
 * ahead of a client release. It renders under its own name with no description,
 * rather than as a raw `whatsappPreference.categories.x.label` key — the row
 * still lists it, so the person can still switch it off.
 */
export function whatsappCategoryCopy(t: WaCategoryTranslate, category: string): WaCategoryCopy {
  const known = COPY[category];
  if (known) return known(t);
  return { label: category, description: '' };
}
