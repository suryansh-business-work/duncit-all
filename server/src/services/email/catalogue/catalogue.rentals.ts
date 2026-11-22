import { CALM, LIVE, PAUSED, STOPPED } from './mjml';
import { FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * The rented-items ("Pod Rent") emails: items booked with a pod payment, called
 * off, returned, and a refund that is delayed; plus the generic "refund
 * processed" email the rentals send once Razorpay confirms a refund.
 *
 * Each is the email twin of a WhatsApp scenario (same moment, same values in
 * the same order — see `WA_EVENTS`), sent by `rentalNotify` through
 * `notifyEvent`. Written here as data so the Communications portal edits and
 * translates them like every other email. A refund is only called processed in
 * `refund-processed`; every other row says it is on its way.
 */

const F = {
  bookedBy: 'email.field.bookedBy',
  amountPaid: 'email.field.amountPaid',
  item: 'email.field.item',
  outcome: 'email.field.outcome',
  depositRefund: 'email.field.depositRefund',
  refundFor: 'email.field.refundFor',
} as const;

const RENTED_ITEMS = 'email.label.rentedItems';
const VIEW_RENTALS = 'email.cta.viewRentals';

const NAME = v('name', 'The recipient’s name.', 'Aarav');
const ITEMS = v('items', 'The rented items, with quantities.', 'UNO Cards × 1, Chess set × 2');
const POD = v('pod_title', 'The pod the items are rented for.', 'Sunday Chess Meetup');
const POD_WHEN = v('pod_when', 'When the pod starts.', '29 Nov 2026, 07:30 PM');
const GUEST_URL = v('rentals_url', 'The guest’s rented items page.', 'https://mweb.duncit.com/rented-items');
const VENUE_URL = v(
  'rentals_url',
  'The venue’s rented items page in the Partners console.',
  'https://partners-app.duncit.com/venues/rented-items'
);

export const RENTAL_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'venue-rental-booked',
    name: 'Rented Items: Booked (Venue)',
    description: 'The venue owner, when a guest’s pod payment books rented items from their venue: what to have ready, for which pod.',
    audience: 'VENUE',
    category: 'transactional',
    fires: 'A guest’s pod payment books rented items from the venue',
    waEvent: 'VENUE_RENTAL_BOOKED',
    subject: 'Rented items booked for {{pod_title}}',
    footerNote: FOOTER.venue,
    vars: [
      v('name', 'The venue owner’s name.', 'Rohan'),
      ITEMS,
      POD,
      POD_WHEN,
      v('guest_name', 'The guest who booked the items.', 'Aarav Mehta'),
      v('order_ref', 'The payment reference the items were booked on.', 'DPAY-MI4K2Z1A9F3C21B7'),
      VENUE_URL,
    ],
    body: {
      copyKey: 'email.venueRentalBooked',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: RENTED_ITEMS,
      calloutVar: 'items',
      rows: [
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: FIELD.when, valueVar: 'pod_when' },
        { labelKey: F.bookedBy, valueVar: 'guest_name' },
        { labelKey: FIELD.paymentId, valueVar: 'order_ref' },
      ],
      ctaKey: VIEW_RENTALS,
      ctaVar: 'rentals_url',
    },
  }),
  defineEmail({
    slug: 'rental-booked-user',
    name: 'Rented Items: Booked',
    description: 'The guest, when their pod payment books the items they rented: what, for which pod, where, and what they paid.',
    audience: 'USER',
    category: 'transactional',
    fires: 'The guest’s pod payment books their rented items',
    waEvent: 'USER_RENTAL_BOOKED',
    subject: 'Your rented items for {{pod_title}} are booked',
    footerNote: FOOTER.purchase,
    vars: [
      NAME,
      ITEMS,
      POD,
      POD_WHEN,
      v('venue', 'The venue handing the items over.', 'The Board Room Cafe'),
      v('amount_paid', 'Rent plus any refundable deposit, with its currency.', 'Rs 650.00'),
      GUEST_URL,
    ],
    body: {
      copyKey: 'email.rentalBookedUser',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: RENTED_ITEMS,
      calloutVar: 'items',
      rows: [
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: FIELD.when, valueVar: 'pod_when' },
        { labelKey: FIELD.venue, valueVar: 'venue' },
        { labelKey: F.amountPaid, valueVar: 'amount_paid' },
      ],
      ctaKey: VIEW_RENTALS,
      ctaVar: 'rentals_url',
    },
  }),
  defineEmail({
    slug: 'venue-rental-cancelled',
    name: 'Rented Items: Called Off (Venue)',
    description: 'The venue owner, when rented items booked from their venue are no longer needed: the pod was cancelled or the guest left it.',
    audience: 'VENUE',
    category: 'transactional',
    fires: 'Rented items are called off: the pod was cancelled or the guest left the pod',
    waEvent: 'VENUE_RENTAL_CANCELLED',
    subject: 'Rented items no longer needed for {{pod_title}}',
    footerNote: FOOTER.venue,
    vars: [
      v('name', 'The venue owner’s name.', 'Rohan'),
      ITEMS,
      POD,
      POD_WHEN,
      v('reason', 'Why the items were called off.', 'The guest left the pod'),
      VENUE_URL,
    ],
    body: {
      copyKey: 'email.venueRentalCancelled',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: RENTED_ITEMS,
      calloutVar: 'items',
      rows: [
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: FIELD.when, valueVar: 'pod_when' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
      ],
      ctaKey: VIEW_RENTALS,
      ctaVar: 'rentals_url',
    },
  }),
  defineEmail({
    slug: 'rental-cancelled-user',
    name: 'Rented Items: Cancelled',
    description:
      'The guest, when their rented items are cancelled (the pod was cancelled, they left it, or an item sold out before their payment went through), with the refund on its way.',
    audience: 'USER',
    category: 'billing',
    fires: 'The guest’s rented items are cancelled: pod cancelled, guest left, or sold out before capture',
    waEvent: 'USER_RENTAL_CANCELLED',
    subject: 'Your rented items for {{pod_title}} were cancelled',
    footerNote: FOOTER.purchase,
    vars: [
      NAME,
      ITEMS,
      POD,
      v('reason', 'Why the items were cancelled.', 'The pod was cancelled'),
      v('refund_amount', 'What is being refunded, with its currency.', 'Rs 350.00'),
      GUEST_URL,
    ],
    body: {
      copyKey: 'email.rentalCancelledUser',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: RENTED_ITEMS,
      calloutVar: 'items',
      rows: [
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
        { labelKey: FIELD.refund, valueVar: 'refund_amount' },
      ],
      ctaKey: VIEW_RENTALS,
      ctaVar: 'rentals_url',
    },
  }),
  defineEmail({
    slug: 'rental-returned-user',
    name: 'Rented Items: Returned',
    description:
      'The guest, when the venue (or the automatic release) records a rented item returned or damaged, with the deposit refund on its way.',
    audience: 'USER',
    category: 'billing',
    fires: 'A rented item is recorded returned or damaged, by the venue or the auto-release',
    waEvent: 'USER_RENTAL_RETURNED',
    subject: 'The return of your rented item for {{pod_title}} is recorded',
    footerNote: FOOTER.purchase,
    vars: [
      NAME,
      v('item', 'The rented item, with its quantity.', 'UNO Cards × 1'),
      POD,
      v('outcome', 'What the venue recorded, and anything kept from the deposit.', 'Returned in good shape'),
      v('deposit_refund', 'The deposit coming back, with its currency.', 'Rs 200.00'),
      GUEST_URL,
    ],
    body: {
      copyKey: 'email.rentalReturnedUser',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: F.depositRefund,
      calloutVar: 'deposit_refund',
      rows: [
        { labelKey: F.item, valueVar: 'item' },
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
        { labelKey: F.outcome, valueVar: 'outcome' },
      ],
      ctaKey: VIEW_RENTALS,
      ctaVar: 'rentals_url',
    },
  }),
  defineEmail({
    slug: 'rental-refund-delayed-user',
    name: 'Rented Items: Refund Delayed',
    description:
      'The guest, when the payment provider would not take a rental refund after every retry. Finance is alerted at the same time and sends it again.',
    audience: 'USER',
    category: 'billing',
    fires: 'Razorpay did not accept a rental refund after every retry; Finance is reviewing it',
    waEvent: 'USER_RENTAL_REFUND_DELAYED',
    subject: 'Your refund of {{amount}} is taking longer than usual',
    footerNote: FOOTER.purchase,
    vars: [
      NAME,
      v('amount', 'The refund that is delayed, with its currency.', 'Rs 200.00'),
      v('item', 'The rented item, with its quantity.', 'UNO Cards × 1'),
      POD,
      GUEST_URL,
    ],
    body: {
      copyKey: 'email.rentalRefundDelayedUser',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: LABEL.refund,
      calloutVar: 'amount',
      rows: [
        { labelKey: F.item, valueVar: 'item' },
        { labelKey: FIELD.pod, valueVar: 'pod_title' },
      ],
      ctaKey: VIEW_RENTALS,
      ctaVar: 'rentals_url',
      helpKey: HELP.noAction,
    },
  }),
  defineEmail({
    slug: 'refund-processed',
    name: 'Refund Processed',
    description:
      'Anyone whose refund the payment provider has confirmed processed: how much, what it was for, and how long it usually takes to land. Sent only after the provider confirms it.',
    audience: 'USER',
    category: 'billing',
    fires: 'A refund is confirmed processed by the payment provider (today: rented items)',
    waEvent: 'USER_REFUND_PROCESSED',
    subject: 'Your refund of {{amount}} has been processed',
    footerNote: FOOTER.purchase,
    vars: [
      NAME,
      v('amount', 'The refund, with its currency.', 'Rs 200.00'),
      v('refund_for', 'What the refund is for.', 'UNO Cards rented for Sunday Chess Meetup'),
      v('refund_days', 'Working days the refund usually takes to land.', '7'),
    ],
    body: {
      copyKey: 'email.refundProcessed',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.refund,
      calloutVar: 'amount',
      rows: [{ labelKey: F.refundFor, valueVar: 'refund_for' }],
      helpKey: HELP.refundTiming,
    },
  }),
];

/** English copy for the rows above — shipped and seeded like every other email key. */
export const RENTAL_EMAIL_FALLBACK: Record<string, string> = {
  'email.field.bookedBy': 'Booked by',
  'email.field.amountPaid': 'Amount paid',
  'email.field.item': 'Item',
  'email.field.outcome': 'Outcome',
  'email.field.depositRefund': 'Deposit refund',
  'email.field.refundFor': 'Refund for',
  'email.label.rentedItems': 'Rented items',
  'email.cta.viewRentals': 'View rented items',
  'email.venueRentalBooked.title': 'Items booked from your venue',
  'email.venueRentalBooked.body':
    'A guest has booked the items below with their pod payment. Please have them ready to hand over at the pod.',
  'email.rentalBookedUser.title': 'Your rented items are booked',
  'email.rentalBookedUser.body':
    'Your pod payment has booked the items below. The venue hands them over at the pod. The amount paid includes any refundable deposit, which comes back to your original payment method once the items are returned.',
  'email.venueRentalCancelled.title': 'Rented items no longer needed',
  'email.venueRentalCancelled.body':
    'The items below are no longer needed for this pod, for the reason given. Please do not hand them out for this pod.',
  'email.rentalCancelledUser.title': 'Your rented items were cancelled',
  'email.rentalCancelledUser.body':
    'The items below were cancelled, for the reason given. The refund shown is on its way to your original payment method, and we will tell you again once it is processed.',
  'email.rentalReturnedUser.title': 'The return of your rented item is recorded',
  'email.rentalReturnedUser.body':
    'Your rented item below has been marked returned, with the outcome shown. The deposit refund shown is on its way to your original payment method, and we will tell you again once it is processed.',
  'email.rentalRefundDelayedUser.title': 'Your refund is taking longer than usual',
  'email.rentalRefundDelayedUser.body':
    'We could not complete the refund below with our payment provider yet. Our Finance team is looking into it and will send it again.',
  'email.refundProcessed.title': 'Your refund has been processed',
  'email.refundProcessed.body':
    'Your refund has been processed and is on its way to your original payment method. It usually arrives within {{refund_days}} working days.',
};
