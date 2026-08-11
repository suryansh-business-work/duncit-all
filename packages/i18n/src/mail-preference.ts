import type { TranslateOptions } from './translator';

/**
 * The nine email categories, named and explained in the reader's language.
 *
 * Every key is written out as a literal `t('…')` call rather than composed from
 * a namespace and the category the server sent. Two reasons, and both matter:
 *  - `scripts/verify-translation-keys.mjs` greps source for the literal key, so
 *    a computed key is reported as shipped-but-never-rendered and fails the
 *    Shared Gates job — which is exactly what it did for all eighteen of these;
 *  - a typo in a computed key fails silently at runtime as the key itself
 *    printed on screen, while a literal one is greppable.
 *
 * It lives here, once, because three surfaces render the same nine names — mWeb
 * and the native app on Mail Preference (rule 27), and the Marketing portal on
 * Mail Preference Analytics (rules 34/40). "Activity" and "Notifications"
 * meaning the same category on two screens is a support ticket waiting to
 * happen.
 */

/** The `t` any surface hands in. Structural, so no surface owns this module. */
export type MailCategoryTranslate = (key: string, options?: TranslateOptions) => string;

export interface MailCategoryCopy {
  label: string;
  description: string;
}

/**
 * Built per category rather than all nine at once: a row asks for one, and the
 * analytics table asks per cell.
 */
const COPY: Record<string, (t: MailCategoryTranslate) => MailCategoryCopy> = {
  marketing: (t) => ({
    label: t('mailPreference.categories.marketing.label'),
    description: t('mailPreference.categories.marketing.description'),
  }),
  notification: (t) => ({
    label: t('mailPreference.categories.notification.label'),
    description: t('mailPreference.categories.notification.description'),
  }),
  service: (t) => ({
    label: t('mailPreference.categories.service.label'),
    description: t('mailPreference.categories.service.description'),
  }),
  support: (t) => ({
    label: t('mailPreference.categories.support.label'),
    description: t('mailPreference.categories.support.description'),
  }),
  transactional: (t) => ({
    label: t('mailPreference.categories.transactional.label'),
    description: t('mailPreference.categories.transactional.description'),
  }),
  authentication: (t) => ({
    label: t('mailPreference.categories.authentication.label'),
    description: t('mailPreference.categories.authentication.description'),
  }),
  billing: (t) => ({
    label: t('mailPreference.categories.billing.label'),
    description: t('mailPreference.categories.billing.description'),
  }),
  legal: (t) => ({
    label: t('mailPreference.categories.legal.label'),
    description: t('mailPreference.categories.legal.description'),
  }),
  internal: (t) => ({
    label: t('mailPreference.categories.internal.label'),
    description: t('mailPreference.categories.internal.description'),
  }),
};

/**
 * What one category is called, and what it means.
 *
 * A category this bundle has no copy for yet is a server that added a tenth
 * category ahead of a client release. It renders under its own name with no
 * description, rather than as a raw `mailPreference.categories.x.label` key —
 * the row still lists it, so the person can still switch it off.
 */
export function mailCategoryCopy(t: MailCategoryTranslate, category: string): MailCategoryCopy {
  const known = COPY[category];
  if (known) return known(t);
  return { label: category, description: '' };
}
