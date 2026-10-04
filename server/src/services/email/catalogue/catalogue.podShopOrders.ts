import { CALM, STOPPED } from './mjml';
import { CTA, FIELD, FOOTER, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * Pod Shop orders after checkout — partner-brand products bought in the apps.
 * Separate from the pet store's `store-*` mails: a different shop with its own
 * cancellation and return rules (rule 65).
 */
export const POD_SHOP_ORDER_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'pod-shop-order-cancelled',
    name: 'Pod Shop — Order Cancelled (Apology + Refund)',
    description:
      'The buyer, when Duncit cancels their Pod Shop order — an operator’s force cancel in the Products portal, or a brand that asked for the product to be removed with its orders cancelled. Says sorry and states the full refund.',
    audience: 'USER',
    category: 'transactional',
    fires: 'forceCancelProductOrder, or an approved CANCEL_AND_REFUND deletion request',
    subject: 'We’re sorry — your order {{order_no}} was cancelled',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'The buyer’s name.', 'Aarav'),
      v('order_no', 'The order number.', 'ord_mu8319d825afec77'),
      v('items', 'What was on the order, with quantities.', 'Yonex Mavis 350 × 2'),
      v('refund_amount', 'What goes back: cash to the original payment, and coins if any were spent.', '₹1,180.00 + 20 Duncit Coins'),
      v('reason', 'Why it was cancelled.', 'The brand has stopped selling this product.'),
      v('orders_url', 'The buyer’s orders page.', 'https://mweb.duncit.com/orders'),
    ],
    body: {
      copyKey: 'email.podShopOrderCancelled',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: [
        { labelKey: FIELD.items, valueVar: 'items' },
        { labelKey: FIELD.refund, valueVar: 'refund_amount' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
      ],
      ctaKey: CTA.viewOrder,
      ctaVar: 'orders_url',
      helpKey: 'email.podShopOrderCancelled.footer',
    },
  }),
  defineEmail({
    slug: 'pod-shop-return-update',
    name: 'Pod Shop — Return Update',
    description:
      'The buyer, at each step of a Pod Shop return: requested, approved (courier pickup booked), rejected, received at the warehouse, refunded.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A pod-shop return changes status',
    subject: 'Your return {{return_no}}: {{status}}',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'The buyer’s name.', 'Aarav'),
      v('return_no', 'The return number.', 'RET-7F3A21'),
      v('order_no', 'The order it returns goods from.', 'ord_mu8319d825afec77'),
      v('status', 'Where the return is, in words.', 'approved — a courier will collect it'),
      v('note', 'The brand’s or Duncit’s note, if any.', 'Please pack it in the original box.'),
      v('refund_amount', 'What went back (refunded step only).', '₹590.00'),
      v('orders_url', 'The buyer’s orders page.', 'https://mweb.duncit.com/orders'),
    ],
    body: {
      copyKey: 'email.podShopReturnUpdate',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.order,
      calloutVar: 'return_no',
      rows: [
        { labelKey: FIELD.orderNo, valueVar: 'order_no' },
        { labelKey: FIELD.status, valueVar: 'status' },
        { labelKey: FIELD.notes, valueVar: 'note' },
        { labelKey: FIELD.refund, valueVar: 'refund_amount' },
      ],
      ctaKey: CTA.viewOrder,
      ctaVar: 'orders_url',
    },
  }),
  defineEmail({
    slug: 'catalog-deletion-update',
    name: 'Brand/Product Deletion Request Update',
    description:
      'The brand owner, when their request to delete a brand or product is approved, rejected, or carried out by the Products team.',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A deletion request is reviewed in the Products portal, or the scheduled deletion runs',
    subject: 'Deletion request for {{item_name}}: {{status}}',
    footerNote: '',
    vars: [
      v('name', 'The brand owner.', 'Ananya'),
      v('item_name', 'The brand or product.', 'Yonex Mavis 350 Shuttlecock'),
      v('status', 'Where the request is, in words.', 'approved — it will be deleted on 12 Nov 2026'),
      v('note', 'The Products team’s note.', 'Two orders are still with the courier.'),
      v('partners_url', 'The partner portal.', 'https://partners-app.duncit.com/ecomm-brand'),
    ],
    body: {
      copyKey: 'email.catalogDeletionUpdate',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.product,
      calloutVar: 'item_name',
      rows: [
        { labelKey: FIELD.status, valueVar: 'status' },
        { labelKey: FIELD.notes, valueVar: 'note' },
      ],
      ctaKey: CTA.openPartners,
      ctaVar: 'partners_url',
    },
  }),
];
