import { CALM, LIVE, PAUSED, STOPPED, type Tone } from './mjml';
import { CTA, FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef, type EmailVar } from './catalogue.types';

/**
 * Support conversations, account security, ads and refunds.
 *
 * The five support emails are one shape and five moments, because a ticket's
 * whole life is the same three values — who, which ticket, about what — and
 * only the sentence changes. The security pair carry no ticket and no pod: they
 * are the two moments a person needs to be able to say "that was not me".
 */

/** `['Recipient name', 'Ticket ID', 'Subject']`, in the WhatsApp event's order. */
const ticketVars: readonly EmailVar[] = [
  v('name', 'The person who raised the ticket.', 'Aarav'),
  v('ticket_no', 'The ticket’s reference, quoted in every reply.', 'ST-000412'),
  v('subject', 'What the ticket is about.', 'Refund not received for DUN-POD-1042'),
];

const TICKET_ROWS = [{ labelKey: FIELD.subject, valueVar: 'subject' }] as const;

interface TicketStep {
  slug: string;
  name: string;
  copyKey: string;
  subject: string;
  tone: Tone;
  fires: string;
  description: string;
  waEvent?: string;
  /** The rating link, for the two that ask how it went. */
  feedback?: boolean;
}

/**
 * A ticket's five moments.
 *
 * `resolved`, `reopened` and the feedback request have no WhatsApp twin — the
 * WhatsApp catalogue stops at "updated". They are still built here so a ticket
 * reads as one story in the reader's inbox rather than three of five chapters.
 */
const TICKET_STEPS: readonly TicketStep[] = [
  {
    slug: 'support-ticket-created',
    name: 'Support: Ticket Created',
    copyKey: 'email.supportTicketCreated',
    subject: 'We have your request — {{ticket_no}}',
    tone: CALM,
    fires: 'A support ticket is raised',
    description: 'The person who raised a support ticket, confirming it landed and giving them the reference.',
    waEvent: 'SUPPORT_TICKET_CREATED',
  },
  {
    slug: 'support-ticket-in-progress',
    name: 'Support: Ticket In Progress',
    copyKey: 'email.supportTicketInProgress',
    subject: 'Someone is on it — {{ticket_no}}',
    tone: PAUSED,
    fires: 'A support ticket is assigned to an agent',
    description: 'The person who raised the ticket, when an agent picks it up.',
    waEvent: 'SUPPORT_TICKET_IN_PROGRESS',
  },
  {
    slug: 'support-ticket-updated',
    name: 'Support: Ticket Update',
    copyKey: 'email.supportTicketUpdated',
    subject: 'New reply on {{ticket_no}}',
    tone: CALM,
    fires: 'An agent replies on a support ticket',
    description: 'The person who raised the ticket, when an agent adds a reply.',
    waEvent: 'SUPPORT_TICKET_UPDATED',
  },
  {
    slug: 'support-ticket-resolved',
    name: 'Support: Ticket Resolved',
    copyKey: 'email.supportTicketResolved',
    subject: 'Resolved — {{ticket_no}}',
    tone: LIVE,
    fires: 'A support ticket is moved to RESOLVED',
    description: 'The person who raised the ticket, when it is marked resolved. Names the reopen window.',
  },
  {
    slug: 'support-ticket-reopened',
    name: 'Support: Ticket Reopened',
    copyKey: 'email.supportTicketReopened',
    subject: 'Reopened — {{ticket_no}}',
    tone: PAUSED,
    fires: 'A resolved ticket is reopened inside its reopen window',
    description: 'The person who raised the ticket, when a resolved ticket is reopened.',
  },
];

const ticketEmail = (step: TicketStep): EmailDef =>
  defineEmail({
    slug: step.slug,
    name: step.name,
    description: step.description,
    audience: 'SUPPORT',
    category: 'support',
    fires: step.fires,
    waEvent: step.waEvent,
    subject: step.subject,
    footerNote: FOOTER.support,
    vars: [
      ...ticketVars,
      v('ticket_url', 'Deep link to the ticket thread.', 'https://duncit.com/support/tickets/ST-000412'),
    ],
    body: {
      copyKey: step.copyKey,
      nameVar: 'name',
      tone: step.tone,
      calloutLabelKey: LABEL.ticket,
      calloutVar: 'ticket_no',
      rows: TICKET_ROWS,
      ctaKey: CTA.openTicket,
      ctaVar: 'ticket_url',
      helpKey: HELP.supportReply,
    },
  });

export const SUPPORT_EMAILS: readonly EmailDef[] = [
  ...TICKET_STEPS.map(ticketEmail),

  defineEmail({
    slug: 'support-feedback',
    name: 'Support: Feedback',
    description: 'The person whose ticket was closed, asking how the support itself went.',
    audience: 'SUPPORT',
    category: 'marketing',
    fires: 'A support ticket is closed and its reopen window has passed',
    subject: 'How did we do on {{ticket_no}}?',
    footerNote: FOOTER.support,
    vars: [
      ...ticketVars,
      v('feedback_url', 'Deep link to the rating screen for this ticket.', 'https://duncit.com/support/tickets/ST-000412/rate'),
    ],
    body: {
      copyKey: 'email.supportFeedback',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.ticket,
      calloutVar: 'ticket_no',
      rows: TICKET_ROWS,
      ctaKey: CTA.giveFeedback,
      ctaVar: 'feedback_url',
      helpKey: HELP.feedbackWhy,
    },
  }),
];

/**
 * Security notices.
 *
 * `authentication`, which is a REQUIRED mail category — nobody may switch off
 * being told their password changed. Neither of these carries a code or a link
 * that changes anything by being clicked: the CTA opens the account's own
 * security screen, so a phishing copy of this email has nothing to steal.
 */
export const SECURITY_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'recent-account-login',
    name: 'Recent Account Login',
    description: 'The account holder, when their account is signed in to from a device or place they have not used before.',
    audience: 'USER',
    category: 'authentication',
    fires: 'A sign-in succeeds from an unrecognised device or location',
    subject: 'New sign-in to your Duncit account',
    footerNote: FOOTER.security,
    vars: [
      v('name', 'The account holder’s first name.', 'Aarav'),
      v('when', 'When the sign-in happened, in their timezone.', '23 Aug 2026, 9:14 PM IST'),
      v('device', 'The browser or app that signed in.', 'Chrome on Windows'),
      v('place', 'Roughly where from, as far as we can tell.', 'Noida, India'),
      v('security_url', 'Deep link to the account’s security screen.', 'https://duncit.com/profile/security'),
    ],
    body: {
      copyKey: 'email.recentAccountLogin',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.signIn,
      calloutVar: 'when',
      rows: [
        { labelKey: FIELD.device, valueVar: 'device' },
        { labelKey: FIELD.place, valueVar: 'place' },
      ],
      ctaKey: CTA.secureAccount,
      ctaVar: 'security_url',
    },
  }),

  defineEmail({
    slug: 'password-changed',
    name: 'Password Reset Notification',
    description: 'The account holder, after their password is actually changed. The confirmation, not the code.',
    audience: 'USER',
    category: 'authentication',
    fires: 'A password reset or password change completes',
    subject: 'Your Duncit password was changed',
    footerNote: FOOTER.security,
    vars: [
      v('name', 'The account holder’s first name.', 'Aarav'),
      v('when', 'When the change happened, in their timezone.', '23 Aug 2026, 9:14 PM IST'),
      v('email', 'The account the password belongs to.', 'aarav@example.com'),
      v('security_url', 'Deep link to the account’s security screen.', 'https://duncit.com/profile/security'),
    ],
    body: {
      copyKey: 'email.passwordChanged',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.account,
      calloutVar: 'email',
      rows: [{ labelKey: FIELD.when, valueVar: 'when' }],
      ctaKey: CTA.secureAccount,
      ctaVar: 'security_url',
    },
  }),
];

/**
 * The advertiser's two decisions, and the refund a shop order produces.
 *
 * `ad-rejected` is here beside the pair that was asked for: the same review
 * writes one of three outcomes, and shipping two of them means an advertiser
 * whose ad was turned down hears nothing at all.
 */
export const COMMERCE_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'ad-in-review',
    name: 'Ad In Review',
    description: 'The advertiser, when their ad is submitted and waiting on review.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'An ad request is submitted and sits at PENDING',
    subject: 'Your ad is in review',
    footerNote: FOOTER.ads,
    vars: [
      v('name', 'The advertiser’s first name.', 'Ananya'),
      v('ad_title', 'What the ad is called.', 'Monsoon Racket Sale'),
      v('campaign', 'The placement it was booked for.', 'Home — top banner'),
      v('when', 'When it was submitted, already formatted.', '23 Aug 2026'),
      v('ad_url', 'Deep link to the ad in the Ads console.', 'https://ads.duncit.com/requests/DUN-AD-118'),
    ],
    body: {
      copyKey: 'email.adInReview',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.ad,
      calloutVar: 'ad_title',
      rows: [
        { labelKey: FIELD.campaign, valueVar: 'campaign' },
        { labelKey: FIELD.when, valueVar: 'when' },
      ],
      ctaKey: CTA.viewAd,
      ctaVar: 'ad_url',
    },
  }),

  defineEmail({
    slug: 'ad-live',
    name: 'Ad Is Live',
    description: 'The advertiser, when their ad is approved and starts showing.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'An ad request is approved and its run starts',
    subject: 'Your ad is live 🎉',
    footerNote: FOOTER.ads,
    vars: [
      v('name', 'The advertiser’s first name.', 'Ananya'),
      v('ad_title', 'What the ad is called.', 'Monsoon Racket Sale'),
      v('campaign', 'The placement it is running in.', 'Home — top banner'),
      v('when', 'The run window, already formatted.', '24 Aug 2026 – 7 Sep 2026'),
      v('ad_url', 'Deep link to the ad in the Ads console.', 'https://ads.duncit.com/requests/DUN-AD-118'),
    ],
    body: {
      copyKey: 'email.adLive',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.ad,
      calloutVar: 'ad_title',
      rows: [
        { labelKey: FIELD.campaign, valueVar: 'campaign' },
        { labelKey: FIELD.when, valueVar: 'when' },
      ],
      ctaKey: CTA.viewAd,
      ctaVar: 'ad_url',
    },
  }),

  defineEmail({
    slug: 'ad-rejected',
    name: 'Ad Rejected',
    description: 'The advertiser, when their ad is not approved. Carries the reviewer’s reason.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'An ad request is rejected in review',
    subject: 'About your Duncit ad',
    footerNote: FOOTER.ads,
    vars: [
      v('name', 'The advertiser’s first name.', 'Ananya'),
      v('ad_title', 'What the ad is called.', 'Monsoon Racket Sale'),
      v('campaign', 'The placement it was booked for.', 'Home — top banner'),
      v('reason', 'Why it was not approved, in the reviewer’s words.', 'The creative does not meet our image guidelines.'),
      v('ad_url', 'Deep link to the ad in the Ads console.', 'https://ads.duncit.com/requests/DUN-AD-118'),
    ],
    body: {
      copyKey: 'email.adRejected',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.ad,
      calloutVar: 'ad_title',
      rows: [
        { labelKey: FIELD.campaign, valueVar: 'campaign' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
      ],
      ctaKey: CTA.viewAd,
      ctaVar: 'ad_url',
    },
  }),

  defineEmail({
    slug: 'order-refund',
    name: 'Order Refund',
    description: 'The shopper, when a Pod Shop order is refunded. The pod’s own refund email is `pod-refund`.',
    audience: 'USER',
    category: 'billing',
    fires: 'A product order is refunded',
    subject: 'Refund initiated — {{order_no}}',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The shopper’s first name.', 'Aarav'),
      v('order_no', 'The order’s reference.', 'DUN-ORD-771'),
      v('amount', 'The refund, pre-formatted with its currency.', '₹899'),
      v('reason', 'Why it was refunded, in the operator’s words.', 'Item out of stock'),
      v('refund_days', 'Working days the refund takes to land.', '5-7'),
      v('order_url', 'Deep link to the order.', 'https://duncit.com/shop/orders/DUN-ORD-771'),
    ],
    body: {
      copyKey: 'email.orderRefund',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.refund,
      calloutVar: 'amount',
      rows: [
        { labelKey: FIELD.orderNo, valueVar: 'order_no' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
        { labelKey: FIELD.refundDays, valueVar: 'refund_days' },
      ],
      ctaKey: CTA.viewOrder,
      ctaVar: 'order_url',
      helpKey: HELP.refundTiming,
    },
  }),
];
