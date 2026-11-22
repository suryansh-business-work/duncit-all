import { CALM, LIVE, PAUSED } from './mjml';
import { CTA, FIELD, FOOTER, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef, type EmailVar } from './catalogue.types';

/**
 * Gift card order emails: confirmed (payment received), dispatched with the
 * tracking number, out for delivery, a failed delivery attempt, and delivered.
 *
 * Each is the email twin of a WhatsApp event (same moment, same values in the
 * same order — see `WA_EVENTS`), sent by `notifyGiftCardOrder` through
 * `notifyEvent`. The codes themselves never appear here: a digital card's code
 * travels only in its own `gift-card-received` email, and a printed card's
 * passcode only under its scratch panel.
 */

const F = {
  cardValue: 'email.field.cardValue',
  deliveryMethod: 'email.field.deliveryMethod',
} as const;

const NAME = v('name', 'The buyer’s first name.', 'Aarav');
const ORDER_NO = v('order_no', 'The gift card order number.', 'GC-7H2K9QXAMB');
const ORDER_URL = v(
  'order_url',
  'The order page with its tracking, on mWeb or in the app.',
  'https://mweb.duncit.com/gift-cards/orders/GC-7H2K9QXAMB'
);
/** Email-only lines, after the WhatsApp params. */
const EXTRA: readonly EmailVar[] = [
  v('quantity', 'How many cards the order holds.', '2'),
  v('card_amount', 'The face value of one card, with its currency.', '₹500.00'),
  v('delivery', 'How the cards travel, in words.', 'Printed card, by courier'),
];

const ORDER_ROWS = [
  { labelKey: FIELD.orderNo, valueVar: 'order_no' },
  { labelKey: FIELD.quantity, valueVar: 'quantity' },
  { labelKey: F.cardValue, valueVar: 'card_amount' },
  { labelKey: F.deliveryMethod, valueVar: 'delivery' },
];

/** The three courier moments that carry nothing but the order and its link. */
function courierStep(
  slug: string,
  waEvent: string,
  name: string,
  copyKey: string,
  subject: string,
  fires: string,
  tone: typeof CALM
): EmailDef {
  return defineEmail({
    slug,
    name,
    description: `The buyer of a printed gift card order, when ${fires.toLowerCase()}.`,
    audience: 'USER',
    category: 'transactional',
    fires,
    waEvent,
    subject,
    footerNote: FOOTER.purchase,
    vars: [NAME, ORDER_NO, ORDER_URL, ...EXTRA],
    body: {
      copyKey,
      nameVar: 'name',
      tone,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: ORDER_ROWS.slice(1),
      ctaKey: CTA.viewOrder,
      ctaVar: 'order_url',
    },
  });
}

export const GIFT_CARD_ORDER_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'gift-card-order-confirmed',
    name: 'Gift Card Order: Confirmed',
    description:
      'The buyer, once a gift card order is paid: the order number, what was bought and how it travels. Digital codes follow in their own emails; printed cards follow by courier.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A gift card order is paid',
    waEvent: 'GIFT_CARD_ORDER_CONFIRMED',
    subject: 'Your gift card order {{order_no}} is confirmed',
    footerNote: FOOTER.purchase,
    vars: [NAME, ORDER_NO, v('amount', 'What was paid, with its currency.', '₹1,049.00'), ORDER_URL, ...EXTRA],
    body: {
      copyKey: 'email.giftCardOrderConfirmed',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.giftCard,
      calloutVar: 'amount',
      rows: ORDER_ROWS,
      ctaKey: CTA.viewOrder,
      ctaVar: 'order_url',
    },
  }),
  defineEmail({
    slug: 'gift-card-order-shipped',
    name: 'Gift Card Order: Dispatched',
    description: 'The buyer of a printed gift card order, when the courier collects it — with the courier and tracking number.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A printed gift card order is handed to the courier',
    waEvent: 'GIFT_CARD_ORDER_SHIPPED',
    subject: 'Your gift cards are on their way ({{order_no}})',
    footerNote: FOOTER.purchase,
    vars: [
      NAME,
      ORDER_NO,
      v('courier', 'The courier carrying the parcel.', 'Delhivery'),
      v('awb', 'The courier’s tracking number.', '1234567890123'),
      ORDER_URL,
      ...EXTRA,
    ],
    body: {
      copyKey: 'email.giftCardOrderShipped',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: [
        { labelKey: FIELD.courier, valueVar: 'courier' },
        { labelKey: FIELD.trackingNo, valueVar: 'awb' },
        ...ORDER_ROWS.slice(1),
      ],
      ctaKey: CTA.viewOrder,
      ctaVar: 'order_url',
    },
  }),
  courierStep(
    'gift-card-order-out-for-delivery',
    'GIFT_CARD_ORDER_OUT_FOR_DELIVERY',
    'Gift Card Order: Out for Delivery',
    'email.giftCardOrderOutForDelivery',
    'Your gift cards arrive today ({{order_no}})',
    'A printed gift card order goes out for delivery',
    CALM
  ),
  courierStep(
    'gift-card-order-delivery-failed',
    'GIFT_CARD_ORDER_DELIVERY_FAILED',
    'Gift Card Order: Delivery Attempt Failed',
    'email.giftCardOrderDeliveryFailed',
    'We could not deliver your gift cards ({{order_no}})',
    'The courier could not deliver a printed gift card order',
    PAUSED
  ),
  defineEmail({
    slug: 'gift-card-order-delivered',
    name: 'Gift Card Order: Delivered',
    description:
      'The buyer, when a gift card order is delivered — a digital order once every card is emailed, a printed one when the courier hands it over.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A gift card order is delivered',
    waEvent: 'GIFT_CARD_ORDER_DELIVERED',
    subject: 'Your gift card order {{order_no}} was delivered',
    footerNote: FOOTER.purchase,
    vars: [NAME, ORDER_NO, ORDER_URL, ...EXTRA],
    body: {
      copyKey: 'email.giftCardOrderDelivered',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: ORDER_ROWS.slice(1),
      ctaKey: CTA.viewOrder,
      ctaVar: 'order_url',
    },
  }),
];

/** English copy for these emails — shipped and seeded like every other email key. */
export const GIFT_CARD_ORDER_EMAIL_FALLBACK: Record<string, string> = {
  'email.field.cardValue': 'Value per card',
  'email.field.deliveryMethod': 'Delivery',
  'email.giftCardOrderConfirmed.title': 'Your gift card order is confirmed',
  'email.giftCardOrderConfirmed.body':
    'Thank you — we have received your payment. Emailed cards arrive in separate emails, one per card; printed cards are prepared and sent by courier, and we will write again when they ship.',
  'email.giftCardOrderShipped.title': 'Your gift cards are on their way',
  'email.giftCardOrderShipped.body':
    'Your printed gift cards have left us. Track the parcel with the courier and tracking number below.',
  'email.giftCardOrderOutForDelivery.title': 'Your gift cards arrive today',
  'email.giftCardOrderOutForDelivery.body':
    'The courier is out delivering your printed gift cards. Please keep your phone close in case they call.',
  'email.giftCardOrderDeliveryFailed.title': 'We could not deliver your gift cards',
  'email.giftCardOrderDeliveryFailed.body':
    'The courier tried but could not deliver your parcel. They will try again — please make sure someone can receive it, or contact support if the address needs changing.',
  'email.giftCardOrderDelivered.title': 'Your gift cards were delivered',
  'email.giftCardOrderDelivered.body':
    'Your gift card order has been delivered. Whoever holds a card can add its value to their Duncit account from Gift Cards › Redeem.',
};
