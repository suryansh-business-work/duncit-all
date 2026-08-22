import { CALM, LIVE, PAUSED, STOPPED } from './mjml';
import { CTA, FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * The emails a member gets.
 *
 * Each of these mirrors a WhatsApp scenario that was already wired — the same
 * moment, the same values, in the channel that survives a phone change. The
 * `vars` order is the WhatsApp event's `params` order, which is what lets
 * `notifyEvent` fill both from one array at the existing call site.
 */

/** The eight values every "your pod was cancelled" message carries, in order. */
const CANCELLED_VARS = [
  v('name', 'The member’s first name.', 'Aarav'),
  v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
  v('pod', 'The pod’s title again, as the details line names it.', 'Sunday Badminton Doubles'),
  v('date', 'The date the pod was to run on, already formatted.', '24 Aug 2026'),
  v('time', 'The start time, already formatted.', '7:00 AM'),
  v('refund_amount', 'The refund, pre-formatted with its currency.', '₹450'),
  v('pod_url', 'Deep link to the pod.', 'https://duncit.com/pod/DUN-POD-1042'),
  v('refund_days', 'Working days the refund takes to land.', '5-7'),
] as const;

/** The rows under the callout on every cancellation. */
const CANCELLED_ROWS = [
  { labelKey: FIELD.date, valueVar: 'date' },
  { labelKey: FIELD.time, valueVar: 'time' },
  { labelKey: FIELD.refund, valueVar: 'refund_amount' },
  { labelKey: FIELD.refundDays, valueVar: 'refund_days' },
] as const;

/**
 * Who cancelled is three templates, not one with a `{{cancelled_by}}` variable.
 *
 * The apology is different in each: a host who pulled out owes one, a venue
 * that lost the court is nobody's fault, and Duncit cancelling is Duncit's
 * fault. One template with the name swapped in would have to be worded so
 * blandly it says nothing — and the WhatsApp side already treats them as three
 * campaigns for exactly this reason.
 */
const cancelledBy = (by: 'Host' | 'Venue' | 'Duncit', slug: string, waEvent: string): EmailDef => {
  const who = by === 'Duncit' ? 'Duncit or a club admin' : `the ${by.toLowerCase()}`;
  const opener = by === 'Duncit' ? 'Duncit or a club admin' : `The ${by.toLowerCase()}`;
  return defineEmail({
    slug,
    name: `Pod Cancelled by ${by}`,
    description: `The members of a pod, when ${who} cancels it. Carries the refund.`,
    audience: 'USER',
    category: 'billing',
    fires: `${opener} cancels a pod that has members`,
    waEvent,
    subject: 'Pod cancelled — {{pod_title}}',
    footerNote: FOOTER.podJoined,
    vars: CANCELLED_VARS,
    body: {
      copyKey: `email.userPodCancelled${by}`,
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: CANCELLED_ROWS,
      ctaKey: CTA.viewPod,
      ctaVar: 'pod_url',
      helpKey: HELP.refundTiming,
    },
  });
};

export const USER_EMAILS: readonly EmailDef[] = [
  cancelledBy('Host', 'user-pod-cancelled-by-host', 'USER_POD_CANCELLED_BY_HOST'),
  cancelledBy('Venue', 'user-pod-cancelled-by-venue', 'USER_POD_CANCELLED_BY_VENUE'),
  cancelledBy('Duncit', 'user-pod-cancelled-by-duncit', 'USER_POD_CANCELLED_BY_DUNCIT'),

  defineEmail({
    slug: 'user-pod-reminder',
    name: 'Pod Reminder',
    description:
      'A member, a configurable number of hours before a pod they joined starts.',
    audience: 'USER',
    category: 'notification',
    fires: 'A joined pod starts soon (the reminder window is set in Admin > Pods)',
    waEvent: 'USER_POD_REMINDER',
    subject: 'Starting in {{hours}} hours — {{pod}}',
    footerNote: FOOTER.podJoined,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('hours', 'Hours until the pod starts.', '12'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('pod_url', 'Deep link to the pod.', 'https://duncit.com/pod/DUN-POD-1042'),
      v('host', 'The host’s name.', 'Meera Nair'),
    ],
    body: {
      copyKey: 'email.userPodReminder',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date' },
        { labelKey: FIELD.time, valueVar: 'time' },
        { labelKey: FIELD.host, valueVar: 'host' },
        { labelKey: FIELD.hours, valueVar: 'hours' },
      ],
      ctaKey: CTA.viewPod,
      ctaVar: 'pod_url',
      helpKey: HELP.noAction,
    },
  }),

  defineEmail({
    slug: 'payment-failed',
    name: 'Payment Failed',
    description:
      'The member, when a pod payment does not go through. The seat is not held, so the email says so and links straight back.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A pod payment fails or is abandoned at the gateway',
    waEvent: 'USER_PAYMENT_FAILED',
    subject: 'Payment didn’t go through — {{pod_title}}',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('pod', 'The pod’s title again, for the details line.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('pod_url', 'Deep link back to the pod, to try again.', 'https://duncit.com/pod/DUN-POD-1042'),
      v('host', 'The host’s name.', 'Meera Nair'),
      v('payment_id', 'The gateway payment id, for support to trace.', 'pay_QK2f81ZzX9'),
    ],
    body: {
      copyKey: 'email.userPaymentFailed',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date' },
        { labelKey: FIELD.time, valueVar: 'time' },
        { labelKey: FIELD.host, valueVar: 'host' },
        { labelKey: FIELD.paymentId, valueVar: 'payment_id' },
      ],
      ctaKey: CTA.retryPayment,
      ctaVar: 'pod_url',
    },
  }),

  defineEmail({
    slug: 'pod-replacement-not-found',
    name: 'Replacement Not Found',
    description:
      'The member who backed out, when nobody took the seat before the pod started — so no refund is due.',
    audience: 'USER',
    category: 'notification',
    fires: 'A backed-out spot is still unfilled when the pod starts',
    waEvent: 'USER_REPLACEMENT_NOT_FOUND',
    subject: 'No replacement found — {{pod}}',
    footerNote: FOOTER.podJoined,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('pod_url', 'Deep link to the pod.', 'https://duncit.com/pod/DUN-POD-1042'),
    ],
    body: {
      copyKey: 'email.userReplacementNotFound',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date' },
        { labelKey: FIELD.time, valueVar: 'time' },
      ],
      ctaKey: CTA.viewPod,
      ctaVar: 'pod_url',
    },
  }),

  defineEmail({
    slug: 'user-pod-feedback',
    name: 'Pod Feedback Request',
    description: 'The member, after a pod they attended finishes. Asks for a rating.',
    audience: 'USER',
    category: 'marketing',
    fires: 'A pod the member attended is completed',
    waEvent: 'USER_POD_FEEDBACK',
    subject: 'How was {{pod}}?',
    footerNote: FOOTER.podJoined,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The date it ran, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('feedback_url', 'Deep link to the rating screen for this pod.', 'https://duncit.com/pod/DUN-POD-1042/rate'),
    ],
    body: {
      copyKey: 'email.userPodFeedback',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date' },
        { labelKey: FIELD.time, valueVar: 'time' },
      ],
      ctaKey: CTA.giveFeedback,
      ctaVar: 'feedback_url',
      helpKey: HELP.feedbackWhy,
    },
  }),

  defineEmail({
    slug: 'user-account-suspended',
    name: 'Account Suspended',
    description: 'The member, when their Duncit account is suspended.',
    audience: 'USER',
    category: 'notification',
    fires: 'An admin moves the account to SUSPENDED',
    waEvent: 'USER_ACCOUNT_SUSPENDED',
    subject: 'Your Duncit account has been suspended',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('email', 'The account’s address, named in the callout.', 'aarav@example.com'),
    ],
    body: {
      copyKey: 'email.userAccountSuspended',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.account,
      calloutVar: 'email',
      helpKey: HELP.accountPaused,
    },
  }),

  defineEmail({
    slug: 'user-account-reactivated',
    name: 'Account Reactivated',
    description: 'The member, when a suspended account is restored.',
    audience: 'USER',
    category: 'notification',
    fires: 'An admin moves a suspended account back to ACTIVE',
    waEvent: 'USER_ACCOUNT_REACTIVATED',
    subject: 'Your Duncit account is active again',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('email', 'The account’s address, named in the callout.', 'aarav@example.com'),
    ],
    body: {
      copyKey: 'email.userAccountReactivated',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.account,
      calloutVar: 'email',
      ctaKey: CTA.openApp,
      ctaVar: 'app_url',
      helpKey: HELP.accountLive,
    },
  }),
];
