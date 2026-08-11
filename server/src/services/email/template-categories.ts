import type { EmailCategory } from './email.provider';

/**
 * Which header/footer fragment wraps each template.
 *
 * This is the map the migration writes into `EmailTemplate.fragment_key` (the nine that ship use their category name as the key),
 * and it is the only place the assignment is decided. Deliberate rather than
 * defaulted: `authentication` is anything carrying a code or a credential,
 * `billing` is money, `internal` never reaches a customer, `marketing` can be
 * unsubscribed from, and `notification` is "something about your booking
 * changed".
 *
 * A slug missing from here is left alone by the migration and reported, so a
 * new template is a conscious decision rather than a silent default.
 *
 * Grouped by category rather than written slug-by-slug, so the reason for each
 * assignment is visible — and so a slug like `password-reset-otp` is a list
 * entry rather than an object key beside a string literal, which a secrets
 * scanner reads as a hard-coded credential (S2068). These are template names.
 */
const BY_CATEGORY: Record<EmailCategory, string[]> = {
  // Codes and credentials.
  authentication: [
    'account-deletion-otp',
    'admin-credentials',
    'email-verification-otp',
    'password-change-otp',
    'password-reset-otp',
    'portal-login-otp',
  ],

  // Money.
  billing: ['payment-receipt', 'payment-release-approved', 'payout-statement', 'pod-refund'],

  // Staff only — never reaches a customer.
  internal: [
    'signed-contract',
    'admin-access-granted',
    'admin-access-revoked',
    'interview-admin',
    'meeting-scheduled-admin',
  ],

  // Opt-out-able.
  marketing: ['newsletter-welcome'],

  // Something changed on their account or booking.
  notification: [
    'host-request-acknowledged',
    'host-request-approved',
    'host-request-rejected',
    'host-request-submitted',
    'interview-applicant',
    'interview-scheduled',
    'meeting-approved',
    'meeting-booked',
    'meeting-cancelled',
    'meeting-rejected',
    'meeting-rescheduled',
    'meeting-scheduled',
    'partner-access-granted',
    'pod-backout-spot-filled',
    'pod-cancelled',
    'pod-updated',
    'venue-slot-request',
  ],

  // Part of a support conversation.
  support: ['contact-received', 'faq-received'],

  // A record of something they did. `unsubscribe-confirmed` is here and not in
  // `marketing` on purpose: it confirms an action the person just took, so it
  // has to arrive even to somebody who has switched marketing off — which is
  // exactly who receives it.
  transactional: ['event-ticket', 'unsubscribe-confirmed', 'welcome'],

  // No template sends as these yet; the fragments exist for when one does.
  service: [],

  // A legal record of something they raised.
  legal: ['grievance-received'],
};

export const TEMPLATE_CATEGORIES: Record<string, EmailCategory> = Object.fromEntries(
  Object.entries(BY_CATEGORY).flatMap(([category, slugs]) =>
    slugs.map((slug) => [slug, category as EmailCategory])
  )
);

/**
 * Each template's own "you're receiving this because…" line.
 *
 * It used to be baked into every template's footer MJML; the chrome around it
 * now lives in the fragment, but the SENTENCE is per-template and worth
 * keeping — "you backed out of this pod" tells a reader more than "there was
 * activity on your account" ever could.
 *
 * The migration lifts these into `EmailTemplate.footer_note` for a database
 * that already holds the old templates. This map is what a FRESH install seeds
 * from, since the sentences are no longer on disk. Blank means the template had
 * no reason line, and the category's generic note is used instead.
 */
export const TEMPLATE_FOOTER_NOTES: Record<string, string> = {
  'account-deletion-otp': "You're receiving this because you use Duncit.",
  'admin-access-granted': "You're receiving this because your Duncit account was granted admin access.",
  'admin-access-revoked': "You're receiving this because your Duncit admin access changed.",
  'admin-credentials': "You're receiving this because you use Duncit.",
  'contact-received': "You're receiving this because you contacted us.",
  'email-verification-otp': "You're receiving this because you use Duncit.",
  'event-ticket': "You're receiving this because you booked a Duncit event.",
  'faq-received': "You're receiving this because you contacted us.",
  'grievance-received': "You're receiving this because you raised a grievance with us.",
  'host-request-acknowledged': "You're receiving this because you applied to host a new category on Duncit.",
  'host-request-approved': "You're receiving this because you applied to host a new category on Duncit.",
  'host-request-rejected': "You're receiving this because you applied to host a new category on Duncit.",
  'host-request-submitted': "You're receiving this because you applied to host a new category on Duncit.",
  'interview-admin': "You're receiving this because you use Duncit.",
  'interview-applicant': "You're receiving this because you applied on Duncit.",
  'interview-scheduled': "You're receiving this because you applied on Duncit.",
  'meeting-approved': "You're receiving this because you started onboarding on Duncit.",
  'meeting-booked': "You're receiving this because you started onboarding on Duncit.",
  'meeting-cancelled': "You're receiving this because you started onboarding on Duncit.",
  'meeting-rejected': "You're receiving this because you started onboarding on Duncit.",
  'meeting-rescheduled': "You're receiving this because you started onboarding on Duncit.",
  'meeting-scheduled-admin': "",
  'meeting-scheduled': "You're receiving this because you started onboarding on Duncit.",
  'newsletter-welcome': "This message was sent because you subscribed at {{site_url}}.",
  'partner-access-granted': "You're receiving this because your Duncit account was granted partner access.",
  'password-change-otp': "You're receiving this because you use Duncit.",
  'password-reset-otp': "You're receiving this because you use Duncit.",
  'signed-contract': "You're receiving this because a Duncit contract was shared with this address.",
  'unsubscribe-confirmed': "You're receiving this because your Duncit email preferences were changed.",
  'portal-login-otp': "You're receiving this because somebody asked to sign in to a Duncit console with this address.",
  'payment-receipt': "You're receiving this because you made a Duncit booking.",
  'payment-release-approved': "You're receiving this because you use Duncit.",
  'payout-statement': "You're receiving this because you host or partner with Duncit.",
  'pod-backout-spot-filled': "You're receiving this because you backed out of this pod on Duncit.",
  'pod-cancelled': "You're receiving this because you joined this pod on Duncit.",
  'pod-refund': "You're receiving this because you paid for this pod on Duncit.",
  'pod-updated': "You're receiving this because you joined this pod on Duncit.",
  'venue-slot-request': "{{t:email.venueSlotRequest.footer}}",
  welcome: "You're receiving this because you use Duncit.",
};
