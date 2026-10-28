import { CALM, LIVE, PAUSED, STOPPED } from './mjml';
import { CTA, FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * The emails added to close the October 2026 communication gaps: moments that
 * changed something for a member, a partner or a staff desk and told nobody.
 *
 * Rows with a `waEvent` are the email twin of a WhatsApp scenario and list
 * their first vars in that scenario's param order (see `catalogue.types`).
 * The rest are sent on their own — a security notice to an OLD address, the
 * deletion trail, a staff desk — where the WhatsApp side has different
 * recipients or none at all.
 *
 * Plain text only in every subject and body: no emoji or symbol icons.
 */

const POD_URL = 'https://mweb.duncit.com/club/sunset-club/pod/sunday-badminton';
const ORDERS_URL = 'https://mweb.duncit.com/orders';
const CONTACT_URL = 'https://duncit.com/contact';

/** The five values a pod-cancelled notice to a partner carries, in order. */
const PARTNER_CANCELLED_VARS = [
  v('name', 'The recipient’s name.', 'Rohan'),
  v('pod_title', 'The pod’s title.', 'Sunday Badminton Doubles'),
  v('date', 'The date the pod was to run on.', '24 Aug 2026'),
  v('time', 'The start time.', '07:00 AM'),
  v('cancelled_by', 'Who cancelled it.', 'the host'),
] as const;

const PARTNER_CANCELLED_ROWS = [
  { labelKey: FIELD.date, valueVar: 'date' },
  { labelKey: FIELD.time, valueVar: 'time' },
  { labelKey: FIELD.cancelledBy, valueVar: 'cancelled_by' },
] as const;

/** The pod-shop delivery steps share everything but their wording. */
const podShopStep = (
  slug: string,
  waEvent: string,
  name: string,
  copyKey: string,
  subject: string,
  fires: string,
  withCourier: boolean
): EmailDef =>
  defineEmail({
    slug,
    name,
    description: `The pod-shop buyer, when ${fires.toLowerCase()}.`,
    audience: 'USER',
    category: 'transactional',
    fires,
    waEvent,
    subject,
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'The buyer’s first name.', 'Aarav'),
      v('order_no', 'The order number.', 'DUN-ORD-1042'),
      ...(withCourier ? [v('courier', 'The courier carrying it.', 'Delhivery')] : []),
      v('orders_url', 'Link to the buyer’s orders.', ORDERS_URL),
    ],
    body: {
      copyKey,
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: withCourier ? [{ labelKey: FIELD.courier, valueVar: 'courier' }] : [],
      ctaKey: CTA.viewOrder,
      ctaVar: 'orders_url',
      helpKey: HELP.noAction,
    },
  });

const MEMBER_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'user-pod-rescheduled',
    name: 'Pod Rescheduled',
    description: 'Everyone booked on a pod, when its date, time or venue is moved.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A portal edit or a change request moves a booked pod to a new time or venue',
    waEvent: 'USER_POD_RESCHEDULED',
    subject: 'Your pod has moved: {{pod_title}}',
    footerNote: FOOTER.podJoined,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('pod_title', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The NEW date.', '25 Aug 2026'),
      v('time', 'The NEW start time.', '08:00 AM'),
      v('venue', 'Where it now happens.', 'Smash Arena'),
      v('pod_url', 'Deep link to the pod.', POD_URL),
    ],
    body: {
      copyKey: 'email.userPodRescheduled',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date' },
        { labelKey: FIELD.time, valueVar: 'time' },
        { labelKey: FIELD.venue, valueVar: 'venue' },
      ],
      ctaKey: CTA.viewPod,
      ctaVar: 'pod_url',
      helpKey: HELP.podMoved,
    },
  }),

  defineEmail({
    slug: 'user-pod-reminder-sameday',
    name: 'Pod Reminder (Same Day)',
    description: 'A member, a few hours before a pod they joined starts — where and what time.',
    audience: 'USER',
    category: 'notification',
    fires: 'A joined pod starts within the same-day reminder window (Admin > Pods > Pod Settings)',
    waEvent: 'USER_POD_REMINDER_SAMEDAY',
    subject: 'Today: {{pod_title}} at {{time}}',
    footerNote: FOOTER.podJoined,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('pod_title', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('time', 'The start time.', '07:00 AM'),
      v('venue', 'Where it happens.', 'Smash Arena'),
      v('pod_url', 'Deep link to the pod.', POD_URL),
    ],
    body: {
      copyKey: 'email.userPodReminderSameDay',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        { labelKey: FIELD.time, valueVar: 'time' },
        { labelKey: FIELD.venue, valueVar: 'venue' },
      ],
      ctaKey: CTA.viewPod,
      ctaVar: 'pod_url',
      helpKey: HELP.noAction,
    },
  }),

  podShopStep(
    'pod-shop-order-shipped',
    'POD_SHOP_ORDER_SHIPPED',
    'Pod Shop: Order Shipped',
    'email.podShopOrderShipped',
    'Your order {{order_no}} is on its way',
    'A pod-shop order is handed to the courier',
    true
  ),
  podShopStep(
    'pod-shop-order-out-for-delivery',
    'POD_SHOP_ORDER_OUT_FOR_DELIVERY',
    'Pod Shop: Out for Delivery',
    'email.podShopOrderOutForDelivery',
    'Your order {{order_no}} arrives today',
    'A pod-shop order goes out for delivery',
    false
  ),
  podShopStep(
    'pod-shop-order-delivered',
    'POD_SHOP_ORDER_DELIVERED',
    'Pod Shop: Order Delivered',
    'email.podShopOrderDelivered',
    'Your order {{order_no}} was delivered',
    'A pod-shop order is delivered',
    false
  ),

  defineEmail({
    slug: 'contact-changed-alert',
    name: 'Security: Contact Changed',
    description:
      'The OLD email address (or the unchanged one, when a number moved), after an email, phone or WhatsApp number on the account changes.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A member changes their email address, phone number or WhatsApp number',
    subject: 'Your Duncit {{what}} was changed',
    footerNote: FOOTER.security,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('what', 'Which detail changed.', 'email address'),
      v('when', 'When it changed.', '24 Aug 2026, 07:00 PM'),
      v('support_url', 'The public contact page.', CONTACT_URL),
    ],
    body: {
      copyKey: 'email.contactChanged',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.account,
      calloutVar: 'what',
      rows: [{ labelKey: FIELD.when, valueVar: 'when' }],
      ctaKey: CTA.contactUs,
      ctaVar: 'support_url',
      helpKey: HELP.notYou,
    },
  }),

  defineEmail({
    slug: 'account-deletion-requested',
    name: 'Account Deletion Requested',
    description: 'A member, when their account deletion request is filed. Names the date it becomes permanent.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A member confirms an account deletion request',
    subject: 'Your Duncit account deletion request',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('request_id', 'The deletion request’s reference.', 'DEL-000123'),
      v('contact_url', 'The public contact page.', CONTACT_URL),
      v('delete_on', 'The date the deletion becomes permanent.', '24 Sep 2026'),
    ],
    body: {
      copyKey: 'email.accountDeletionRequested',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.account,
      calloutVar: 'request_id',
      rows: [{ labelKey: FIELD.deleteOn, valueVar: 'delete_on' }],
      ctaKey: CTA.contactUs,
      ctaVar: 'contact_url',
      helpKey: HELP.deletionChangeMind,
    },
  }),

  defineEmail({
    slug: 'account-deletion-rejected',
    name: 'Account Deletion Declined',
    description: 'A member, when the team turns their deletion request down and reopens the account.',
    audience: 'USER',
    category: 'transactional',
    fires: 'An admin rejects an account deletion request',
    subject: 'Your Duncit account is open again',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('request_id', 'The deletion request’s reference.', 'DEL-000123'),
      v('contact_url', 'The public contact page.', CONTACT_URL),
      v('note', 'Why the request was declined.', 'You have an open refund we need to settle first.'),
    ],
    body: {
      copyKey: 'email.accountDeletionRejected',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.account,
      calloutVar: 'request_id',
      rows: [{ labelKey: FIELD.reason, valueVar: 'note' }],
      ctaKey: CTA.contactUs,
      ctaVar: 'contact_url',
    },
  }),

  defineEmail({
    slug: 'account-deletion-completed',
    name: 'Account Deleted',
    description: 'The address on a deletion request, once the account and its data have been removed.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A deletion request is carried out (cron or console)',
    subject: 'Your Duncit account has been deleted',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('request_id', 'The deletion request’s reference.', 'DEL-000123'),
      v('contact_url', 'The public contact page.', CONTACT_URL),
    ],
    body: {
      copyKey: 'email.accountDeletionCompleted',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.account,
      calloutVar: 'request_id',
      ctaKey: CTA.contactUs,
      ctaVar: 'contact_url',
      helpKey: HELP.noAction,
    },
  }),
];

const PARTNER_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'venue-pod-cancelled',
    name: 'Venue: Pod Cancelled',
    description: 'The venue owner, when a pod booked at the venue is cancelled by anyone but the venue.',
    audience: 'VENUE',
    category: 'transactional',
    fires: 'A pod at the venue is cancelled by the host, a club admin, Duncit or the auto-cancel',
    waEvent: 'VENUE_POD_CANCELLED',
    subject: 'Pod cancelled at your venue: {{pod_title}}',
    footerNote: FOOTER.podVenue,
    vars: PARTNER_CANCELLED_VARS,
    body: {
      copyKey: 'email.venuePodCancelled',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: PARTNER_CANCELLED_ROWS,
      helpKey: HELP.noAction,
    },
  }),

  defineEmail({
    slug: 'club-admin-pod-cancelled',
    name: 'Club Admin: Pod Cancelled',
    description: 'Every club admin of the pod’s club, when it is cancelled by somebody else.',
    audience: 'CLUB_ADMIN',
    category: 'transactional',
    fires: 'A pod in the club is cancelled by the host, the venue, Duncit or the auto-cancel',
    waEvent: 'CLUB_ADMIN_POD_CANCELLED',
    subject: 'Pod cancelled in your club: {{pod_title}}',
    footerNote: FOOTER.podClub,
    vars: PARTNER_CANCELLED_VARS,
    body: {
      copyKey: 'email.clubAdminPodCancelled',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: PARTNER_CANCELLED_ROWS,
      helpKey: HELP.noAction,
    },
  }),

  defineEmail({
    slug: 'venue-pod-reminder',
    name: 'Venue: Pod Coming Up',
    description: 'The venue owner, on the attendee-reminder clock, with the headcount and the host to expect.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'A pod at the venue starts within the reminder window (Admin > Pods > Pod Settings)',
    waEvent: 'VENUE_POD_REMINDER',
    subject: 'Coming up at your venue: {{pod_title}}',
    footerNote: FOOTER.podVenue,
    vars: [
      v('name', 'The venue owner’s name.', 'Rohan'),
      v('pod_title', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The date it runs on.', '24 Aug 2026'),
      v('time', 'The start time.', '07:00 AM'),
      v('guests', 'Seats booked so far.', '12'),
      v('host', 'The host to expect at the door.', 'Meera N'),
    ],
    body: {
      copyKey: 'email.venuePodReminder',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date' },
        { labelKey: FIELD.time, valueVar: 'time' },
        { labelKey: FIELD.guests, valueVar: 'guests' },
        { labelKey: FIELD.host, valueVar: 'host' },
      ],
      helpKey: HELP.noAction,
    },
  }),

  defineEmail({
    slug: 'ecomm-new-order',
    name: 'Brand: New Order',
    description: 'Each brand owner behind a paid pod-shop order, naming only that brand’s lines.',
    audience: 'ECOMM',
    category: 'transactional',
    fires: 'A pod-shop order with the brand’s products is paid',
    waEvent: 'ECOMM_NEW_ORDER',
    subject: 'New order to pack: {{order_no}}',
    footerNote: FOOTER.brand,
    vars: [
      v('name', 'The brand owner’s name.', 'Kavya'),
      v('order_no', 'The order number.', 'DUN-ORD-1042'),
      v('items', 'This brand’s lines on the order.', '2 x Tug Rope, 1 x Ball'),
      v('order_url', 'The order in the Partners console.', 'https://partners-app.duncit.com/ecomm-brand/orders/66f0a1'),
    ],
    body: {
      copyKey: 'email.ecommNewOrder',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: [{ labelKey: FIELD.items, valueVar: 'items' }],
      ctaKey: CTA.openBrandOrder,
      ctaVar: 'order_url',
    },
  }),

  defineEmail({
    slug: 'payout-rejected',
    name: 'Payout Not Approved',
    description: 'The beneficiary of a payout release Finance rejected, with the reason.',
    audience: 'HOST',
    category: 'billing',
    fires: 'Finance rejects a pending payout release',
    subject: 'Payout not approved: {{pod_title}}',
    footerNote: FOOTER.payout,
    vars: [
      v('name', 'The beneficiary’s name.', 'Meera N'),
      v('pod_title', 'The pod the payout is for.', 'Sunday Badminton Doubles'),
      v('amount', 'The amount requested, with its currency.', 'Rs 2,400.00'),
      v('reason', 'Why Finance rejected it.', 'The venue bill does not match the booking.'),
      v('release_id', 'The payout release reference.', 'REL-000245'),
    ],
    body: {
      copyKey: 'email.payoutRejected',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.payout,
      calloutVar: 'release_id',
      rows: [
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: FIELD.amount, valueVar: 'amount' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
      ],
      helpKey: HELP.payoutRejected,
    },
  }),

  defineEmail({
    slug: 'bank-details-changed',
    name: 'Security: Payout Details Changed',
    description: 'A host or venue owner, when the account their payouts go to is changed after approval.',
    audience: 'HOST',
    category: 'transactional',
    fires: 'An approved host or venue changes its bank or UPI details',
    subject: 'Your Duncit payout details were changed',
    footerNote: FOOTER.security,
    vars: [
      v('name', 'The partner’s name.', 'Meera N'),
      v('account', 'The new destination, masked.', 'XXXXXX4321'),
      v('when', 'When it changed.', '24 Aug 2026, 07:00 PM'),
      v('contact_url', 'The public contact page.', CONTACT_URL),
    ],
    body: {
      copyKey: 'email.bankDetailsChanged',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.payout,
      calloutVar: 'account',
      rows: [{ labelKey: FIELD.when, valueVar: 'when' }],
      ctaKey: CTA.contactUs,
      ctaVar: 'contact_url',
      helpKey: HELP.notYou,
    },
  }),

  defineEmail({
    slug: 'meeting-reminder',
    name: 'Onboarding Meeting Reminder',
    description: 'An applicant, ahead of their scheduled onboarding call (Onboarding > Meetings > Availability).',
    audience: 'HOST',
    category: 'notification',
    fires: 'A scheduled onboarding meeting starts within the reminder window',
    subject: 'Reminder: your Duncit onboarding call on {{date}}',
    footerNote: FOOTER.onboarding,
    vars: [
      v('name', 'The applicant’s name.', 'Meera N'),
      v('date', 'The meeting date.', '24 Aug 2026'),
      v('time', 'The meeting time.', '11:30 AM'),
      v('meeting_link', 'The call link, or a note that it is coming.', 'https://meet.google.com/abc-defg-hij'),
    ],
    body: {
      copyKey: 'email.meetingReminder',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.meeting,
      calloutVar: 'date',
      rows: [
        { labelKey: FIELD.time, valueVar: 'time' },
        { labelKey: FIELD.meetingLink, valueVar: 'meeting_link' },
      ],
      helpKey: HELP.onboardingNext,
    },
  }),
];

const STAFF_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'staff-alert',
    name: 'Staff Desk Alert',
    description:
      'Every active manager of a desk (Finance, Legal) when something needs them now: a refused refund, a new grievance, a new content report.',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'A refund is refused by the gateway, a grievance is filed, or content is reported',
    subject: '{{title}}',
    footerNote: FOOTER.staff,
    vars: [
      v('name', 'The manager’s first name.', 'Priya'),
      v('title', 'What happened, with its reference.', 'New grievance: GRV-000031'),
      v('details', 'The facts needed to act.', 'Subject: Refund not received | Source: WEBSITE'),
    ],
    body: {
      copyKey: 'email.staffAlert',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.alert,
      calloutVar: 'title',
      rows: [{ labelKey: FIELD.details, valueVar: 'details' }],
    },
  }),
];

/** The second batch: lower-urgency gaps, each still a moment that told nobody. */
const FOLLOW_UP_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'host-pod-reminder',
    name: 'Host: Pod Coming Up',
    description: 'Every host of a pod, on the attendee-reminder clock, with the headcount.',
    audience: 'HOST',
    category: 'notification',
    fires: 'A hosted pod starts within the reminder window (Admin > Pods > Pod Settings)',
    waEvent: 'HOST_POD_REMINDER',
    subject: 'You are hosting {{pod_title}} on {{date}}',
    footerNote: FOOTER.podHosted,
    vars: [
      v('name', 'The host’s name.', 'Meera N'),
      v('pod_title', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('date', 'The date it runs on.', '24 Aug 2026'),
      v('time', 'The start time.', '07:00 AM'),
      v('guests', 'Seats booked so far.', '12'),
      v('pod_url', 'Deep link to the pod.', POD_URL),
    ],
    body: {
      copyKey: 'email.hostPodReminder',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date' },
        { labelKey: FIELD.time, valueVar: 'time' },
        { labelKey: FIELD.guests, valueVar: 'guests' },
      ],
      ctaKey: CTA.viewPod,
      ctaVar: 'pod_url',
    },
  }),

  defineEmail({
    slug: 'user-checkout-pending',
    name: 'Unfinished Booking',
    description: 'A member who started paying for a pod and did not finish — once, while spots remain.',
    audience: 'USER',
    category: 'marketing',
    fires: 'A pod checkout stays unpaid for the nudge delay (Admin > Pods > Pod Settings)',
    waEvent: 'USER_CHECKOUT_PENDING',
    subject: 'Still want a spot at {{pod_title}}?',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name.', 'Aarav'),
      v('pod_title', 'The pod’s title.', 'Sunday Badminton Doubles'),
      v('when', 'When it runs.', '24 Aug 2026, 07:00 AM'),
      v('pod_url', 'Deep link to the pod.', POD_URL),
    ],
    body: {
      copyKey: 'email.userCheckoutPending',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [{ labelKey: FIELD.when, valueVar: 'when' }],
      ctaKey: CTA.retryPayment,
      ctaVar: 'pod_url',
    },
  }),

  defineEmail({
    slug: 'ecomm-product-declined',
    name: 'Brand: Product Declined',
    description: 'The listing owner, when a product is declined at review, with the reviewer’s reason.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A product listing is declined at review',
    waEvent: 'ECOMM_PRODUCT_DECLINED',
    subject: '{{product}} was not approved',
    footerNote: FOOTER.brand,
    vars: [
      v('name', 'The owner’s first name.', 'Kavya'),
      v('product', 'The product’s name.', 'Tug Rope Large'),
      v('brand', 'The brand it was listed under.', 'Pawsome'),
      v('reason', 'Why it was declined.', 'The product photos are blurred.'),
    ],
    body: {
      copyKey: 'email.ecommProductDeclined',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.product,
      calloutVar: 'product',
      rows: [
        { labelKey: FIELD.brand, valueVar: 'brand' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
      ],
      ctaKey: CTA.openPartners,
      ctaVar: 'app_url',
    },
  }),

  defineEmail({
    slug: 'referral-reward',
    name: 'Referral Reward',
    description: 'The member whose referral code a new member just used, with the coins it earned.',
    audience: 'USER',
    category: 'notification',
    fires: 'A new member signs up with this member’s referral code',
    subject: '{{friend}} joined Duncit with your code',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The referrer’s name.', 'Aarav'),
      v('friend', 'The new member’s first name.', 'Riya'),
      v('coins', 'Coins credited to the referrer.', '50'),
      v('wallet_url', 'The member’s Duncit Coin page.', 'https://mweb.duncit.com/duncit-coin'),
    ],
    body: {
      copyKey: 'email.referralReward',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.coins,
      calloutVar: 'coins',
      rows: [{ labelKey: FIELD.friend, valueVar: 'friend' }],
      ctaKey: CTA.viewCoins,
      ctaVar: 'wallet_url',
    },
  }),

  defineEmail({
    slug: 'coin-expiry-reminder',
    name: 'Coins Expiring Soon',
    description: 'A member whose unspent coins lapse within the reminder window (Loyalty > Duncit Coin).',
    audience: 'USER',
    category: 'notification',
    fires: 'A member’s coins are within the reminder window of their expiry date',
    subject: '{{coins}} Duncit Coins expire on {{expires_on}}',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s name.', 'Aarav'),
      v('coins', 'Coins that expire on that date.', '120'),
      v('expires_on', 'The date they expire.', '30 Oct 2026'),
      v('wallet_url', 'The member’s Duncit Coin page.', 'https://mweb.duncit.com/duncit-coin'),
    ],
    body: {
      copyKey: 'email.coinExpiryReminder',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.coins,
      calloutVar: 'coins',
      rows: [{ labelKey: FIELD.expiresOn, valueVar: 'expires_on' }],
      ctaKey: CTA.viewCoins,
      ctaVar: 'wallet_url',
    },
  }),

  defineEmail({
    slug: 'payout-submitted',
    name: 'Payout Submitted for Review',
    description: 'Each host, venue and club admin on a completed pod, when their payout goes to Finance.',
    audience: 'HOST',
    category: 'billing',
    fires: 'A pod is completed and its payout releases are created for Finance',
    subject: 'Payout submitted for review: {{pod_title}}',
    footerNote: FOOTER.payout,
    vars: [
      v('name', 'The beneficiary’s name.', 'Meera N'),
      v('pod_title', 'The pod the payout is for.', 'Sunday Badminton Doubles'),
      v('amount', 'The amount requested, with its currency.', 'Rs 2,400.00'),
      v('release_id', 'The payout release reference.', 'REL-000245'),
      v('bill_note', 'Whether a venue bill backs it.', 'Based on the venue bill uploaded at completion.'),
    ],
    body: {
      copyKey: 'email.payoutSubmitted',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.payout,
      calloutVar: 'release_id',
      rows: [
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: FIELD.amount, valueVar: 'amount' },
        { labelKey: FIELD.notes, valueVar: 'bill_note' },
      ],
      helpKey: HELP.payoutTiming,
    },
  }),

  defineEmail({
    slug: 'ecomm-order-delivery-issue',
    name: 'Brand: Delivery Issue',
    description: 'The brand owner, when one of its pod-shop deliveries fails, returns to origin or is lost.',
    audience: 'ECOMM',
    category: 'transactional',
    fires: 'A pod-shop order moves to NDR, RTO, RTO delivered or lost',
    subject: 'Delivery issue on order {{order_no}}',
    footerNote: FOOTER.brand,
    vars: [
      v('name', 'The brand owner’s name.', 'Kavya'),
      v('order_no', 'The order number.', 'DUN-ORD-1042'),
      v('items', 'This brand’s lines on the order.', '2 x Tug Rope'),
      v('issue', 'What went wrong.', 'The courier could not deliver it and is waiting for an answer'),
      v('order_url', 'The order in the Partners console.', 'https://partners-app.duncit.com/ecomm-brand/orders/66f0a1'),
    ],
    body: {
      copyKey: 'email.ecommOrderDeliveryIssue',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: [
        { labelKey: FIELD.status, valueVar: 'issue' },
        { labelKey: FIELD.items, valueVar: 'items' },
      ],
      ctaKey: CTA.openBrandOrder,
      ctaVar: 'order_url',
    },
  }),
];

export const LIFECYCLE_EMAILS: readonly EmailDef[] = [
  ...MEMBER_EMAILS,
  ...PARTNER_EMAILS,
  ...STAFF_EMAILS,
  ...FOLLOW_UP_EMAILS,
];
