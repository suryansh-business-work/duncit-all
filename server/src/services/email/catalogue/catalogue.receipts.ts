import { CALM } from './mjml';
import { CTA, FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef, type EmailVar } from './catalogue.types';

/**
 * One receipt per thing a checkout can buy.
 *
 * `payment-receipt` used to be the only one, so a badminton pod, a racket and a
 * gift card all arrived as the same email with a one-line `summary` standing in
 * for what was actually bought — no date, no venue, no order number, no idea
 * who the card was for. The three targets a payment can carry (`POD`,
 * `PRODUCT`, `GIFT_CARD`) each have their own facts and now their own template;
 * `payment-receipt` stays for `OTHER`, which is everything else money is taken
 * for and has nothing but its description.
 *
 * The INVOICE does not fork with them. It is the tax document, the same PDF
 * built by `invoiceDataForPayment` whatever was bought, and it is attached to
 * all four — a receipt says what you bought, the invoice proves what you paid.
 *
 * The three share their shape on purpose: callout, the facts that identify the
 * purchase, the money, then the button to the thing itself. A reader who has
 * booked a pod and bought a product should recognise the second email from the
 * first, and only the middle rows should have to be read.
 */

/** What every receipt carries, whatever it is a receipt for. */
const MONEY_VARS: readonly EmailVar[] = [
  v('invoice_no', 'The invoice reference, and the PDF attached beside it.', 'DUN-INV-2026-000412'),
  v('payment_id', 'The gateway payment id, for tracing a charge.', 'pay_QK2f81ZzX9'),
  v('amount', 'What was actually charged, pre-formatted with its currency.', '₹450.00'),
];

/** The money rows, in the order a receipt is read: what it is, then what it cost. */
const MONEY_ROWS = [
  { labelKey: FIELD.invoiceNo, valueVar: 'invoice_no' },
  { labelKey: FIELD.paymentId, valueVar: 'payment_id' },
  { labelKey: FIELD.amount, valueVar: 'amount' },
] as const;

export const RECEIPT_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'payment-receipt-pod',
    name: 'Payment Receipt — Pod Booking',
    description: 'The receipt for a paid pod booking, with the invoice PDF attached.',
    audience: 'USER',
    category: 'billing',
    fires: 'A payment for a POD is finalized as SUCCESS',
    subject: 'Pod booking receipt — {{invoice_no}}',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'Who paid.', 'Aarav Sharma'),
      v('pod_title', 'The pod that was booked.', 'Sunday Badminton Doubles'),
      v('date_label', 'When it runs, already formatted.', 'Sun, 24 Aug 2026, 7:00 AM'),
      v('venue_line', 'The venue, or the meeting platform for a virtual pod.', 'Sector 62 Sports Arena, Noida'),
      ...MONEY_VARS,
      v('booking_url', 'Deep link to this booking.', 'https://duncit.com/bookings/DUN-MEM-5512'),
    ],
    body: {
      copyKey: 'email.paymentReceiptPod',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.pod,
      calloutVar: 'pod_title',
      rows: [
        { labelKey: FIELD.date, valueVar: 'date_label' },
        { labelKey: FIELD.venue, valueVar: 'venue_line' },
        ...MONEY_ROWS,
      ],
      ctaKey: CTA.viewPod,
      ctaVar: 'booking_url',
      helpKey: HELP.invoiceAttached,
    },
  }),

  defineEmail({
    slug: 'payment-receipt-product',
    name: 'Payment Receipt — Product Order',
    description: 'The receipt for a paid shop order, with the invoice PDF attached.',
    audience: 'USER',
    category: 'billing',
    fires: 'A payment for a PRODUCT is finalized as SUCCESS',
    subject: 'Order receipt — {{invoice_no}}',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'Who paid.', 'Aarav Sharma'),
      v('order_no', 'The order this paid for. Several, comma-joined, when one checkout split into a shipped order and a pickup one.', 'DUN-ORD-3391'),
      v('items', 'What was bought, with quantities.', 'Yonex Astrox 88D × 1, Grip tape × 2'),
      ...MONEY_VARS,
      v('orders_url', 'Deep link to the buyer’s orders.', 'https://duncit.com/orders'),
    ],
    body: {
      copyKey: 'email.paymentReceiptProduct',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: [{ labelKey: FIELD.items, valueVar: 'items' }, ...MONEY_ROWS],
      ctaKey: CTA.viewOrder,
      ctaVar: 'orders_url',
      helpKey: HELP.invoiceAttached,
    },
  }),

  defineEmail({
    slug: 'payment-receipt-gift-card',
    name: 'Payment Receipt — Gift Card',
    description: 'The purchaser’s receipt for a gift card, with the invoice PDF attached.',
    audience: 'USER',
    category: 'billing',
    fires: 'A payment for a GIFT_CARD is finalized as SUCCESS',
    subject: 'Gift card receipt — {{invoice_no}}',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'Who paid for the card.', 'Aarav Sharma'),
      v('card_amount', 'The card’s face value — what the holder can redeem, which is not always what was charged.', '₹1000.00'),
      v('recipient', 'Who the card is for. The buyer’s own name on a self-purchase.', 'Priya Menon'),
      ...MONEY_VARS,
      v('gift_cards_url', 'Deep link to the buyer’s gift cards.', 'https://duncit.com/gift-cards'),
    ],
    body: {
      copyKey: 'email.paymentReceiptGiftCard',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.giftCard,
      calloutVar: 'card_amount',
      rows: [{ labelKey: FIELD.recipient, valueVar: 'recipient' }, ...MONEY_ROWS],
      ctaKey: CTA.viewGiftCard,
      ctaVar: 'gift_cards_url',
      helpKey: HELP.invoiceAttached,
    },
  }),
];
