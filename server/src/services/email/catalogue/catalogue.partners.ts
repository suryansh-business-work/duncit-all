import { CALM, LIVE, PAUSED, STOPPED } from './mjml';
import { CTA, FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef, type EmailVar } from './catalogue.types';

/**
 * What a host, a venue, a brand and a club admin are told once they are live.
 *
 * The onboarding four live in `catalogue.onboarding.ts`; these are the running
 * emails — a slot decided, a pod filled, a payout sent, stock about to run out.
 * Every row mirrors a WhatsApp scenario that was already wired, and its `vars`
 * are in that event's `params` order so `notifyEvent` fills both channels off
 * the one array the call site already builds.
 *
 * There is also no `host-category-added`, even though `HOST_CATEGORY_REQUESTED`
 * is a WhatsApp campaign: the only thing that fires it is a host request being
 * approved, and `host-request-approved` already emails the host at that exact
 * moment naming the category. Two emails one second apart saying the same thing
 * is not two pieces of news.
 *
 * There is deliberately NO `host-payment-sent` / `venue-payment-sent` /
 * `club-admin-payment-sent` / `ecomm-payment-sent` here, even though the
 * WhatsApp catalogue keeps four payout campaigns. `payout-statement` already
 * emails all four the moment a release is approved — with the full split and
 * the payout PDF attached — so a second, thinner payout email would arrive
 * beside it and be the one nobody could reconcile from (rule 34).
 */

/** `['Recipient name', 'Pod', 'Date', 'Time', 'Feedback']` — the feedback four. */
const feedbackVars = (who: string): readonly EmailVar[] => [
  v('name', `The ${who}’s first name.`, 'Meera'),
  v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
  v('date', 'The date it ran, already formatted.', '24 Aug 2026'),
  v('time', 'The start time, already formatted.', '7:00 AM'),
  v('feedback_url', 'Deep link to the feedback form for this pod.', 'https://duncit.com/pod/DUN-POD-1042/rate'),
];

const POD_ROWS = [
  { labelKey: FIELD.date, valueVar: 'date' },
  { labelKey: FIELD.time, valueVar: 'time' },
] as const;

/**
 * The "how did it go" email, for the three people a finished pod owes one to.
 *
 * Same shape, same five values, three audiences — and three templates rather
 * than one, because a host is being asked about their own pod, a venue about
 * their room, and a club admin about a pod they oversaw. The question is not
 * the same question.
 */
const podFeedback = (input: {
  slug: string;
  name: string;
  audience: 'HOST' | 'VENUE' | 'CLUB_ADMIN';
  who: string;
  copyKey: string;
  waEvent: string;
  footer: string;
}): EmailDef =>
  defineEmail({
    slug: input.slug,
    name: input.name,
    description: `The ${input.who}, after a pod finishes. Asks how it went.`,
    audience: input.audience,
    category: 'marketing',
    fires: `A pod the ${input.who} was part of is completed`,
    waEvent: input.waEvent,
    subject: 'How did {{pod}} go?',
    footerNote: input.footer,
    vars: feedbackVars(input.who),
    body: {
      copyKey: input.copyKey,
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: POD_ROWS,
      ctaKey: CTA.giveFeedback,
      ctaVar: 'feedback_url',
      helpKey: HELP.feedbackWhy,
    },
  });

/** `['Recipient name','Pod title','Pod','Date','Time','Venue','Host','Club Admin']`. */
const PUBLISHED_VARS: readonly EmailVar[] = [
  v('name', 'The recipient’s first name.', 'Meera'),
  v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
  v('pod', 'The pod’s title again, for the details line.', 'Sunday Badminton Doubles'),
  v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
  v('time', 'The start time, already formatted.', '7:00 AM'),
  v('venue', 'The venue the pod runs at.', 'Sector 62 Sports Arena'),
  v('host', 'The host running it.', 'Meera Nair'),
  v('club_admin', 'The club admin the pod was handed to.', 'Rohit Sharma'),
];

const PUBLISHED_ROWS = [
  { labelKey: FIELD.date, valueVar: 'date' },
  { labelKey: FIELD.time, valueVar: 'time' },
  { labelKey: FIELD.venue, valueVar: 'venue' },
  { labelKey: FIELD.host, valueVar: 'host' },
  { labelKey: FIELD.clubAdmin, valueVar: 'club_admin' },
] as const;

export const HOST_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'host-slot-approved',
    name: 'Host: Venue Slot Approved',
    description: 'The pod’s hosts, when the venue approves the slot they asked for.',
    audience: 'HOST',
    category: 'notification',
    fires: 'The venue approves a host’s slot request',
    waEvent: 'HOST_SLOT_APPROVED',
    subject: 'Slot approved — {{pod_title}}',
    footerNote: FOOTER.podHosted,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('pod', 'The pod’s title again, for the details line.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('venue', 'The venue that approved it.', 'Sector 62 Sports Arena'),
      v('pod_repeat', 'The pod’s title a third time — the WhatsApp twin repeats it, and the order has to match.', 'Sunday Badminton Doubles'),
    ],
    body: {
      copyKey: 'email.hostSlotApproved',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [...POD_ROWS, { labelKey: FIELD.venue, valueVar: 'venue' }],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'host-slot-rejected',
    name: 'Host: Venue Slot Rejected',
    description: 'The pod’s hosts, when the venue turns down the slot they asked for.',
    audience: 'HOST',
    category: 'notification',
    fires: 'The venue declines a host’s slot request',
    waEvent: 'HOST_SLOT_REJECTED',
    subject: 'Slot not available — {{pod_title}}',
    footerNote: FOOTER.podHosted,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('pod', 'The pod’s title again, for the details line.', 'Sunday Badminton Doubles'),
      v('date', 'The date that was asked for, already formatted.', '24 Aug 2026'),
      v('time', 'The time that was asked for, already formatted.', '7:00 AM'),
      v('venue', 'The venue that declined it.', 'Sector 62 Sports Arena'),
      v('pod_repeat', 'The pod’s title a third time — the WhatsApp twin repeats it, and the order has to match.', 'Sunday Badminton Doubles'),
    ],
    body: {
      copyKey: 'email.hostSlotRejected',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [...POD_ROWS, { labelKey: FIELD.venue, valueVar: 'venue' }],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
      helpKey: HELP.slotDecision,
    },
  }),

  defineEmail({
    slug: 'host-pod-published',
    name: 'Host: Pod Published',
    description: 'The host, when their pod goes live and a club admin is assigned to it.',
    audience: 'HOST',
    category: 'notification',
    fires: 'The pod goes live after the slot is approved',
    waEvent: 'HOST_POD_PUBLISHED',
    subject: 'Your pod is live — {{pod_title}}',
    footerNote: FOOTER.podHosted,
    vars: PUBLISHED_VARS,
    body: {
      copyKey: 'email.hostPodPublished',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: PUBLISHED_ROWS,
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'host-pod-full',
    name: 'Host: Pod Full',
    description: 'The host, when the pod sells its last spot.',
    audience: 'HOST',
    category: 'notification',
    fires: 'The pod’s last remaining spot is booked',
    waEvent: 'HOST_POD_FULL',
    subject: '{{pod}} is full 🎉',
    footerNote: FOOTER.podHosted,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('pod_url', 'Deep link to the pod.', 'https://duncit.com/club/kickstart/pod/DUN-POD-1042'),
      v('club_admin', 'The club admin to reach for anything on the day.', 'Rohit Sharma'),
    ],
    body: {
      copyKey: 'email.hostPodFull',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [...POD_ROWS, { labelKey: FIELD.clubAdmin, valueVar: 'club_admin' }],
      ctaKey: CTA.viewPod,
      ctaVar: 'pod_url',
    },
  }),

  defineEmail({
    slug: 'host-pod-cancellation-requested',
    name: 'Host: Pod Cancellation Request',
    description: 'The host, confirming their own cancellation and what it cost the people who had booked.',
    audience: 'HOST',
    category: 'notification',
    fires: 'The host asks to cancel a pod',
    waEvent: 'HOST_POD_CANCELLATION_REQUESTED',
    subject: 'Cancellation requested — {{pod_title}}',
    footerNote: FOOTER.podHosted,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('pod', 'The pod’s title again, for the details line.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('venue', 'The venue the pod was booked at.', 'Sector 62 Sports Arena'),
      v('spots', 'How many spots were already booked.', '6'),
    ],
    body: {
      copyKey: 'email.hostPodCancellationRequested',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        ...POD_ROWS,
        { labelKey: FIELD.venue, valueVar: 'venue' },
        { labelKey: FIELD.spots, valueVar: 'spots' },
      ],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'host-pod-auto-cancelled',
    name: 'Host: Pod Auto-Cancelled',
    description:
      'The host, when the auto-cancel sweep cancels their pod because it could not cover its venue cost. Attendees are refunded under the venue’s cancellation policy.',
    audience: 'HOST',
    category: 'billing',
    fires: 'The auto-cancel sweep cancels a finance-negative pod',
    subject: 'Pod cancelled — {{pod_title}}',
    footerNote: FOOTER.podHosted,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
      v('venue', 'The venue the pod was booked at.', 'Sector 62 Sports Arena'),
      v('spots', 'How many spots were already booked.', '6'),
    ],
    body: {
      copyKey: 'email.hostPodAutoCancelled',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        ...POD_ROWS,
        { labelKey: FIELD.venue, valueVar: 'venue' },
        { labelKey: FIELD.spots, valueVar: 'spots' },
      ],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'auto-pod-released',
    name: 'Partner: Auto Pod Released',
    description:
      'A venue, host or club admin who had enrolled in an Auto Pod, when Pod Settings’ assignment window closes before every role is on it. The offer is released: the venue’s slot and the host are freed.',
    audience: 'HOST',
    category: 'notification',
    fires: 'The Auto Pod sweep releases an offer whose assignment window closed with a role still missing',
    subject: 'Auto Pod released — {{pod_title}}',
    footerNote: FOOTER.autoPod,
    vars: [
      v('name', 'The partner’s first name.', 'Meera'),
      v('pod_title', 'The Auto Pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('auto_pod_no', 'The Auto Pod’s id.', 'DUN-APOD-1042'),
      v('window', 'The assignment window, already worded.', '72 hours'),
      v('missing', 'The roles that never enrolled, in the reader’s language.', 'Host, Club admin'),
      v('your_part', 'The role this reader had filled.', 'Venue'),
    ],
    body: {
      copyKey: 'email.autoPodReleased',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        { labelKey: 'email.autoPodReleased.window', valueVar: 'window' },
        { labelKey: 'email.autoPodReleased.missing', valueVar: 'missing' },
        { labelKey: 'email.autoPodReleased.yourPart', valueVar: 'your_part' },
      ],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
      helpKey: HELP.noAction,
    },
  }),

  defineEmail({
    slug: 'host-complete-pod-reminder',
    name: 'Host: Complete Pod Reminder',
    description: 'The host, when a pod that has finished is still not marked complete — nobody is paid until it is.',
    audience: 'HOST',
    category: 'notification',
    fires: 'A finished pod is still not completed',
    waEvent: 'HOST_COMPLETE_POD_REMINDER',
    subject: 'Complete {{pod}} to get paid',
    footerNote: FOOTER.podHosted,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The date it ran, already formatted.', '24 Aug 2026'),
      v('time', 'The start time, already formatted.', '7:00 AM'),
    ],
    body: {
      copyKey: 'email.hostCompletePodReminder',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: POD_ROWS,
      ctaKey: CTA.completePod,
      ctaVar: 'app_url',
    },
  }),

  podFeedback({
    slug: 'host-pod-feedback',
    name: 'Host: Pod Feedback',
    audience: 'HOST',
    who: 'host',
    copyKey: 'email.hostPodFeedback',
    waEvent: 'HOST_POD_FEEDBACK',
    footer: FOOTER.podHosted,
  }),
];

export const VENUE_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'venue-new-added',
    name: 'Venue: New Venue Added',
    description: 'The venue owner, confirming a new venue was submitted and is waiting on review.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'A new venue is added by its owner',
    waEvent: 'VENUE_NEW_REQUESTED',
    subject: '{{venue}} has been added',
    footerNote: FOOTER.venue,
    vars: [
      v('name', 'The owner’s first name.', 'Rohit'),
      v('venue', 'The venue’s name.', 'Sector 62 Sports Arena'),
      v('category', 'What the venue is listed under.', 'Badminton'),
    ],
    body: {
      copyKey: 'email.venueNewAdded',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.venue,
      calloutVar: 'venue',
      rows: [{ labelKey: FIELD.category, valueVar: 'category' }],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'venue-slot-pending-reminder',
    name: 'Venue: Pod Slot Approval Reminder',
    description: 'The venue owner, when a slot request is still unanswered and the pod is close.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'A slot request is still undecided as the pod approaches',
    waEvent: 'VENUE_SLOT_PENDING_REMINDER',
    subject: '{{hours}} hours left to decide — {{pod}}',
    footerNote: FOOTER.venue,
    vars: [
      v('name', 'The owner’s first name.', 'Rohit'),
      v('hours', 'Hours until the pod is due to start.', '24'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The requested date, already formatted.', '24 Aug 2026'),
      v('time', 'The requested time, already formatted.', '7:00 AM'),
      v('host', 'The host waiting on the decision.', 'Meera Nair'),
    ],
    body: {
      copyKey: 'email.venueSlotPendingReminder',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [
        ...POD_ROWS,
        { labelKey: FIELD.host, valueVar: 'host' },
        { labelKey: FIELD.hours, valueVar: 'hours' },
      ],
      ctaKey: CTA.reviewSlot,
      ctaVar: 'app_url',
      helpKey: HELP.slotDecision,
    },
  }),


  /**
   * "A pod is looking for you" — the offer an admin makes when a partner asked
   * to be changed off a pod.
   *
   * Three rows rather than one shared builder: the fifth value differs by role
   * (a venue and a club admin need to know the CLUB, a host needs to know the
   * VENUE) because that is the fact each of them decides on, and the sentence
   * under the heading is written for that reader. The first six vars are in
   * their WhatsApp event's params order, which is what lets one array fill
   * both channels.
   */
  defineEmail({
    slug: 'venue-change-request-offer',
    name: 'Venue: Pod Offered After a Change Request',
    description:
      'A venue owner, when Duncit offers them a pod whose current venue asked to be changed.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'An admin offers a venue a pod with an open change request',
    waEvent: 'VENUE_CHANGE_REQUEST_OFFER',
    subject: 'Can you take {{pod}}?',
    footerNote: FOOTER.venue,
    vars: [
      v('name', 'The owner’s first name.', 'Rohit'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The offered slot’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The offered slot’s start time, already formatted.', '7:00 AM'),
      v('club', 'The club the pod belongs to.', 'Noida Racquet Club'),
      v('studio_url', 'Where the offer is answered.', 'https://mweb.duncit.com/change-requests'),
      v('change_request_no', 'The request’s permanent id.', 'DUN-CRQ-000042'),
    ],
    body: {
      copyKey: 'email.venueChangeRequestOffer',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [...POD_ROWS, { labelKey: FIELD.club, valueVar: 'club' }],
      ctaKey: CTA.reviewRequest,
      ctaVar: 'studio_url',
      helpKey: HELP.changeRequestOffer,
    },
  }),

  defineEmail({
    slug: 'host-change-request-offer',
    name: 'Host: Pod Offered After a Change Request',
    description:
      'A host, when Duncit offers them a pod whose current host asked to be changed.',
    audience: 'HOST',
    category: 'notification',
    fires: 'An admin offers a host a pod with an open change request',
    waEvent: 'HOST_CHANGE_REQUEST_OFFER',
    subject: 'Can you run {{pod}}?',
    footerNote: FOOTER.host,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('pod', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The pod’s start time, already formatted.', '7:00 AM'),
      v('venue', 'Where it runs.', 'Sector 62 Sports Arena'),
      v('studio_url', 'Where the offer is answered.', 'https://mweb.duncit.com/change-requests'),
      v('change_request_no', 'The request’s permanent id.', 'DUN-CRQ-000042'),
    ],
    body: {
      copyKey: 'email.hostChangeRequestOffer',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [...POD_ROWS, { labelKey: FIELD.venue, valueVar: 'venue' }],
      ctaKey: CTA.reviewRequest,
      ctaVar: 'studio_url',
      helpKey: HELP.changeRequestOffer,
    },
  }),

  defineEmail({
    slug: 'club-admin-change-request-offer',
    name: 'Club Admin: Club Offered After a Change Request',
    description:
      'A club admin, when Duncit offers them a club whose current admin asked to be changed.',
    audience: 'CLUB_ADMIN',
    category: 'notification',
    fires: 'An admin offers a club admin a pod with an open change request',
    waEvent: 'CLUB_ADMIN_CHANGE_REQUEST_OFFER',
    subject: 'Can you take over {{club}}?',
    footerNote: FOOTER.clubAdmin,
    vars: [
      v('name', 'The club admin’s first name.', 'Priya'),
      v('pod', 'The pod that prompted the ask.', 'Sunday Badminton Doubles'),
      v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
      v('time', 'The pod’s start time, already formatted.', '7:00 AM'),
      v('club', 'The club being handed over.', 'Noida Racquet Club'),
      v('studio_url', 'Where the offer is answered.', 'https://mweb.duncit.com/change-requests'),
      v('change_request_no', 'The request’s permanent id.', 'DUN-CRQ-000042'),
    ],
    body: {
      copyKey: 'email.clubAdminChangeRequestOffer',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: [...POD_ROWS, { labelKey: FIELD.club, valueVar: 'club' }],
      ctaKey: CTA.reviewRequest,
      ctaVar: 'studio_url',
      helpKey: HELP.changeRequestOffer,
    },
  }),

  defineEmail({
    slug: 'venue-slot-approved',
    name: 'Venue: Slot Approved',
    description: 'The venue owner’s own copy of the slot they just approved.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'The venue approves a slot request',
    waEvent: 'VENUE_SLOT_APPROVED',
    subject: 'You approved a slot — {{pod_title}}',
    footerNote: FOOTER.venue,
    vars: [
      v('name', 'The owner’s first name.', 'Rohit'),
      v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('pod', 'The pod’s title again, for the details line.', 'Sunday Badminton Doubles'),
      v('date', 'The booked date, already formatted.', '24 Aug 2026'),
      v('time', 'The booked time, already formatted.', '7:00 AM'),
      v('host', 'The host running it.', 'Meera Nair'),
      v('studio_url', 'The Venue Studio dashboard in the Partners console.', 'https://partners.duncit.com/venues/dashboard'),
    ],
    body: {
      copyKey: 'email.venueSlotApproved',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [...POD_ROWS, { labelKey: FIELD.host, valueVar: 'host' }],
      ctaKey: CTA.openPartners,
      ctaVar: 'studio_url',
    },
  }),

  defineEmail({
    slug: 'venue-slot-rejected',
    name: 'Venue: Slot Rejected',
    description: 'The venue owner’s own copy of the slot request they just declined.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'The venue declines a slot request',
    waEvent: 'VENUE_SLOT_REJECTED',
    subject: 'You declined a slot — {{pod_title}}',
    footerNote: FOOTER.venue,
    vars: [
      v('name', 'The owner’s first name.', 'Rohit'),
      v('pod_title', 'The pod’s title, as the heading names it.', 'Sunday Badminton Doubles'),
      v('pod', 'The pod’s title again, for the details line.', 'Sunday Badminton Doubles'),
      v('date', 'The requested date, already formatted.', '24 Aug 2026'),
      v('time', 'The requested time, already formatted.', '7:00 AM'),
      v('host', 'The host whose request was declined.', 'Meera Nair'),
    ],
    body: {
      copyKey: 'email.venueSlotRejected',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [...POD_ROWS, { labelKey: FIELD.host, valueVar: 'host' }],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'venue-pod-published',
    name: 'Venue: Pod Published',
    description: 'The venue owner, when a pod at their venue goes live and a club admin is assigned.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'The pod goes live at the venue',
    waEvent: 'VENUE_POD_PUBLISHED',
    subject: 'A pod is live at {{venue}} — {{pod_title}}',
    footerNote: FOOTER.venue,
    vars: PUBLISHED_VARS,
    body: {
      copyKey: 'email.venuePodPublished',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: PUBLISHED_ROWS,
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  podFeedback({
    slug: 'venue-pod-feedback',
    name: 'Venue: Pod Feedback',
    audience: 'VENUE',
    who: 'venue owner',
    copyKey: 'email.venuePodFeedback',
    waEvent: 'VENUE_POD_FEEDBACK',
    footer: FOOTER.venue,
  }),
];

/** `['Recipient name','Product','Brand','Available Quantity']`. */
const stockVars: readonly EmailVar[] = [
  v('name', 'The listing owner’s first name.', 'Ananya'),
  v('product', 'The product’s name.', 'Yonex Mavis 350 Shuttlecock'),
  v('brand', 'The brand it is listed under.', 'Yonex'),
  v('available', 'How many units are left.', '3'),
];

const STOCK_ROWS = [
  { labelKey: FIELD.brand, valueVar: 'brand' },
  { labelKey: FIELD.available, valueVar: 'available' },
] as const;

export const ECOMM_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'ecomm-brand-added',
    name: 'Brand: New Brand Added',
    description: 'The brand owner, confirming a new brand was submitted and is waiting on review.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A new brand is added by its owner',
    waEvent: 'ECOMM_BRAND_ADDED',
    subject: '{{brand}} has been added',
    footerNote: FOOTER.brand,
    vars: [
      v('name', 'The owner’s first name.', 'Ananya'),
      v('brand', 'The brand’s name.', 'Yonex'),
      v('category', 'What the brand is listed under.', 'Sports Equipment'),
    ],
    body: {
      copyKey: 'email.ecommBrandAdded',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.brand,
      calloutVar: 'brand',
      rows: [{ labelKey: FIELD.category, valueVar: 'category' }],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'ecomm-product-added',
    name: 'Brand: Product Added',
    description: 'The brand owner, confirming a product was listed and how much stock went in.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A product is added to a brand',
    waEvent: 'ECOMM_PRODUCT_ADDED',
    subject: '{{product}} is listed',
    footerNote: FOOTER.brand,
    vars: [
      v('name', 'The owner’s first name.', 'Ananya'),
      v('product', 'The product’s name.', 'Yonex Mavis 350 Shuttlecock'),
      v('brand', 'The brand it is listed under.', 'Yonex'),
      v('quantity', 'How many units were added.', '120'),
    ],
    body: {
      copyKey: 'email.ecommProductAdded',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.product,
      calloutVar: 'product',
      rows: [
        { labelKey: FIELD.brand, valueVar: 'brand' },
        { labelKey: FIELD.quantity, valueVar: 'quantity' },
      ],
      ctaKey: CTA.manageStock,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'ecomm-stock-low',
    name: 'Brand: Inventory Low',
    description: 'The listing owner, when a product drops to its low-stock mark.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'Available stock crosses the product’s low-stock threshold',
    waEvent: 'ECOMM_STOCK_LOW',
    subject: 'Low stock — {{product}}',
    footerNote: FOOTER.brand,
    vars: stockVars,
    body: {
      copyKey: 'email.ecommStockLow',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.product,
      calloutVar: 'product',
      rows: STOCK_ROWS,
      ctaKey: CTA.manageStock,
      ctaVar: 'app_url',
      helpKey: HELP.stockWhy,
    },
  }),

  defineEmail({
    slug: 'ecomm-stock-out',
    name: 'Brand: Inventory Out Of Stock',
    description: 'The listing owner, when a product runs out and stops being sellable.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'Available stock reaches zero',
    waEvent: 'ECOMM_STOCK_OUT',
    subject: 'Out of stock — {{product}}',
    footerNote: FOOTER.brand,
    vars: stockVars,
    body: {
      copyKey: 'email.ecommStockOut',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.product,
      calloutVar: 'product',
      rows: STOCK_ROWS,
      ctaKey: CTA.manageStock,
      ctaVar: 'app_url',
      helpKey: HELP.stockWhy,
    },
  }),

  defineEmail({
    slug: 'ecomm-order-feedback',
    name: 'Brand: Order Feedback',
    description: 'The brand owner, when a pod carrying their product finishes — asks how the order went.',
    audience: 'ECOMM',
    category: 'marketing',
    fires: 'A pod carrying the brand’s product is completed',
    waEvent: 'ECOMM_FEEDBACK',
    subject: 'How did {{product}} do?',
    footerNote: FOOTER.brand,
    vars: [
      v('name', 'The owner’s first name.', 'Ananya'),
      v('product', 'The product the pod carried.', 'Yonex Mavis 350 Shuttlecock'),
      v('feedback_url', 'Deep link to the feedback form.', 'https://partners.duncit.com/orders/DUN-ORD-771'),
    ],
    body: {
      copyKey: 'email.ecommOrderFeedback',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.product,
      calloutVar: 'product',
      ctaKey: CTA.giveFeedback,
      ctaVar: 'feedback_url',
      helpKey: HELP.feedbackWhy,
    },
  }),
];

/** `['Recipient name','Pod','Date','Time','<who>','<who> Contact']`. */
const helpVars = (who: string, sample: string): readonly EmailVar[] => [
  v('name', 'The club admin’s first name.', 'Rohit'),
  v('pod', 'The pod the help is about.', 'Sunday Badminton Doubles'),
  v('date', 'The pod’s date, already formatted.', '24 Aug 2026'),
  v('time', 'The start time, already formatted.', '7:00 AM'),
  v('who', `The ${who} asking for help.`, sample),
  v('contact', `How to reach the ${who}.`, '+91 98765 43210'),
];

const helpRows = (whoLabel: string, contactLabel: string) =>
  [
    { labelKey: FIELD.date, valueVar: 'date' },
    { labelKey: FIELD.time, valueVar: 'time' },
    { labelKey: whoLabel, valueVar: 'who' },
    { labelKey: contactLabel, valueVar: 'contact' },
  ] as const;

export const CLUB_ADMIN_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'club-admin-host-help',
    name: 'Club Admin: Host Help Requested',
    description: 'The club admin, when a host asks for help on one of their pods.',
    audience: 'CLUB_ADMIN',
    category: 'notification',
    fires: 'A host asks the club admin for help',
    waEvent: 'CLUB_ADMIN_HOST_HELP',
    subject: '{{who}} needs help — {{pod}}',
    footerNote: FOOTER.clubAdmin,
    vars: helpVars('host', 'Meera Nair'),
    body: {
      copyKey: 'email.clubAdminHostHelp',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: helpRows(FIELD.host, FIELD.hostContact),
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'club-admin-venue-help',
    name: 'Club Admin: Venue Help Requested',
    description: 'The club admin, when a venue asks for help on one of their pods.',
    audience: 'CLUB_ADMIN',
    category: 'notification',
    fires: 'A venue asks the club admin for help',
    waEvent: 'CLUB_ADMIN_VENUE_HELP',
    subject: '{{who}} needs help — {{pod}}',
    footerNote: FOOTER.clubAdmin,
    vars: helpVars('venue', 'Sector 62 Sports Arena'),
    body: {
      copyKey: 'email.clubAdminVenueHelp',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod',
      rows: helpRows(FIELD.venue, FIELD.venueContact),
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  podFeedback({
    slug: 'club-admin-pod-feedback',
    name: 'Club Admin: Pod Feedback',
    audience: 'CLUB_ADMIN',
    who: 'club admin',
    copyKey: 'email.clubAdminPodFeedback',
    waEvent: 'CLUB_ADMIN_FEEDBACK',
    footer: FOOTER.clubAdmin,
  }),

];
