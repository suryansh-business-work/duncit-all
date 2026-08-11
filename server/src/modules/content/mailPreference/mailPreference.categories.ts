import { EMAIL_CATEGORIES, type EmailCategory } from '@services/email/email.provider';

/**
 * Which of the nine email categories a person is allowed to decide about.
 *
 * The categories themselves already exist — every send names one, and the email
 * log and the header/footer fragments are both filed by them. This file adds the
 * only thing missing: whether a human is allowed to switch one off.
 *
 * Deliberate, not defaulted. A code that signs you in, a receipt for money you
 * paid, and a notice we are required by law to send are not preferences; a
 * product that let someone opt out of their own OTP would lock them out of the
 * account and call it a setting.
 */

/** Staff-only mail. Never offered as a choice — it never reaches a customer. */
const HIDDEN = new Set<EmailCategory>(['internal']);

/**
 * Mail that is sent whatever the preference says.
 *
 * - `authentication` — OTPs, sign-in codes, credentials. Switching these off is
 *   switching off the ability to sign in.
 * - `billing` — receipts, refunds, payout statements. A record of money moving.
 * - `legal` — notices we are obliged to send.
 * - `transactional` — the record of something the person just did (their ticket,
 *   their booking confirmation). They asked for it by doing the thing.
 */
const REQUIRED = new Set<EmailCategory>(['authentication', 'billing', 'legal', 'transactional']);

/** Every category a person sees on their Mail Preferences screen, in send order. */
export const MAIL_PREFERENCE_CATEGORIES: EmailCategory[] = EMAIL_CATEGORIES.filter(
  (category) => !HIDDEN.has(category)
);

/** The ones a person can actually switch off. */
export const OPTIONAL_MAIL_CATEGORIES: EmailCategory[] = MAIL_PREFERENCE_CATEGORIES.filter(
  (category) => !REQUIRED.has(category)
);

const OPTIONAL = new Set<string>(OPTIONAL_MAIL_CATEGORIES);

/**
 * Can this category be switched off?
 *
 * The send path asks this FIRST, so a required category never reads a
 * preference document at all — an OTP costs exactly what it always cost.
 */
export const isOptionalMailCategory = (category: string): boolean => OPTIONAL.has(category);

/** Is this a category a person is shown at all? Guards the mutations. */
export const isMailPreferenceCategory = (category: string): boolean =>
  MAIL_PREFERENCE_CATEGORIES.includes(category as EmailCategory);
