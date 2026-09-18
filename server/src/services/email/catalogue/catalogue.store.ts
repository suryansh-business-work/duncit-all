import { CALM } from './mjml';
import { CTA, FIELD, FOOTER, HELP, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * The pet store's own emails (ecomm.duncit.com). The ORDER RECEIPT is not here
 * — a store checkout is a product payment, so it gets `payment-receipt-product`
 * with the invoice attached like any shop order, and its button points back at
 * the store. These are what happens after: the parcel moving, a return being
 * decided, a product coming back, and a cart left behind.
 */
export const STORE_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'store-order-cod',
    name: 'Pet Store — Cash on Delivery Order Confirmed',
    description:
      'The buyer of a pet-store Cash-on-Delivery order, the moment it is booked — in place of the paid receipt, because nothing has been paid yet. The invoice PDF is attached.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A pet-store COD order is placed',
    subject: 'Order confirmed — pay on delivery ({{order_no}})',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'Who ordered.', 'Aarav Sharma'),
      v('order_no', 'The order number(s), comma-joined when the parcel is split.', 'ord_m2x8k1c4f3a91b2'),
      v('items', 'What was ordered, with quantities.', 'Grain-free Puppy Food 3 kg × 1'),
      v('invoice_no', 'The invoice reference, and the PDF attached beside it.', 'DUN-INV-2026-000412'),
      v('payment_id', 'The payment record id, for support.', 'pay_QK2f81ZzX9'),
      v('amount', 'What to pay the courier, pre-formatted with its currency.', '₹649.00'),
      v('orders_url', 'Where the buyer tracks the order.', 'https://ecomm.duncit.com/account/orders'),
    ],
    body: {
      copyKey: 'email.storeOrderCod',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.order,
      calloutVar: 'order_no',
      rows: [
        { labelKey: FIELD.items, valueVar: 'items' },
        { labelKey: FIELD.amount, valueVar: 'amount' },
        { labelKey: FIELD.invoiceNo, valueVar: 'invoice_no' },
        { labelKey: FIELD.paymentId, valueVar: 'payment_id' },
      ],
      ctaKey: CTA.viewOrder,
      ctaVar: 'orders_url',
    },
  }),

  defineEmail({
    slug: 'store-order-update',
    name: 'Pet Store — Order Update',
    description:
      'The buyer, each time a pet-store order moves: shipped, out for delivery, delivered, cancelled, or on its way back.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A pet-store order changes fulfilment status',
    subject: 'Your order {{order_no}} — {{status_label}}',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'The shopper’s first name.', 'Aarav'),
      v('order_no', 'The order number.', 'ord_m2x8k1c4f3a91b2'),
      v('status_label', 'Where the order is now, in words.', 'Shipped'),
      v('items', 'What is in the parcel.', 'Grain-free Puppy Food 3 kg × 1'),
      v('courier', 'The courier carrying it, when known.', 'Delhivery'),
      v('awb', 'The courier’s tracking number, when known.', '1234567890123'),
      v('order_url', 'Where the buyer reads the full order and tracking.', 'https://ecomm.duncit.com/account/orders/ord_m2x8k1c4f3a91b2'),
    ],
    body: {
      copyKey: 'email.storeOrderUpdate',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.order,
      calloutVar: 'status_label',
      rows: [
        { labelKey: FIELD.orderNo, valueVar: 'order_no' },
        { labelKey: FIELD.items, valueVar: 'items' },
        { labelKey: FIELD.courier, valueVar: 'courier' },
        { labelKey: FIELD.trackingNo, valueVar: 'awb' },
      ],
      ctaKey: CTA.viewOrder,
      ctaVar: 'order_url',
    },
  }),

  defineEmail({
    slug: 'store-return-update',
    name: 'Pet Store — Return Update',
    description: 'The buyer, each time the ecomm team moves their return request along.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A pet-store return request changes status',
    subject: 'Your return {{return_no}} — {{status_label}}',
    footerNote: FOOTER.purchase,
    vars: [
      v('name', 'The shopper’s first name.', 'Aarav'),
      v('return_no', 'The return reference.', 'RET-7F3K2Q'),
      v('order_no', 'The order it returns goods from.', 'ord_m2x8k1c4f3a91b2'),
      v('status_label', 'Where the return is now, in words.', 'Approved'),
      v('amount', 'The refund decided, pre-formatted with its currency.', '₹899.00'),
      v('note', 'Anything the team wrote for the buyer.', 'Our courier will collect it on Friday.'),
      v('order_url', 'The order page, where the return is tracked.', 'https://ecomm.duncit.com/account/orders/ord_m2x8k1c4f3a91b2'),
    ],
    body: {
      copyKey: 'email.storeReturnUpdate',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.refund,
      calloutVar: 'status_label',
      rows: [
        { labelKey: FIELD.returnNo, valueVar: 'return_no' },
        { labelKey: FIELD.orderNo, valueVar: 'order_no' },
        { labelKey: FIELD.refund, valueVar: 'amount' },
        { labelKey: FIELD.notes, valueVar: 'note' },
      ],
      ctaKey: CTA.viewOrder,
      ctaVar: 'order_url',
    },
  }),

  defineEmail({
    slug: 'store-back-in-stock',
    name: 'Pet Store — Back in Stock',
    description: 'Anyone who asked to be told, once a sold-out pet-store product is sellable again.',
    audience: 'USER',
    category: 'notification',
    fires: 'A product someone subscribed to comes back into stock',
    subject: '{{product_name}} is back in stock',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'Who asked, or a friendly fallback.', 'there'),
      v('product_name', 'The product that is back.', 'Grain-free Puppy Food 3 kg'),
      v('product_url', 'Its page on the store.', 'https://ecomm.duncit.com/p/grain-free-puppy-food-3kg'),
    ],
    body: {
      copyKey: 'email.storeBackInStock',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.product,
      calloutVar: 'product_name',
      ctaKey: CTA.shopNow,
      ctaVar: 'product_url',
      helpKey: HELP.noAction,
    },
  }),

  defineEmail({
    slug: 'store-autoship-due',
    name: 'Pet Store — Autoship Due',
    description:
      'A buyer whose reminder-style Autoship subscription has come due, so they can order this delivery in one tap.',
    audience: 'USER',
    category: 'transactional',
    fires: 'A REMIND Autoship subscription reaches its next date',
    subject: 'Time for your next {{product_name}}',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The buyer’s first name.', 'Aarav'),
      v('product_name', 'What the subscription is for.', 'Grain-free Puppy Food 3 kg'),
      v('qty', 'How many each delivery.', '2'),
      v('frequency', 'Every how many weeks.', '4'),
      v('autoship_url', 'The store’s Autoship page.', 'https://ecomm.duncit.com/autoship'),
    ],
    body: {
      copyKey: 'email.storeAutoshipDue',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.product,
      calloutVar: 'product_name',
      rows: [
        { labelKey: FIELD.eachDelivery, valueVar: 'qty' },
        { labelKey: FIELD.autoshipEvery, valueVar: 'frequency' },
      ],
      ctaKey: CTA.orderNow,
      ctaVar: 'autoship_url',
    },
  }),

  defineEmail({
    slug: 'store-cart-reminder',
    name: 'Pet Store — Cart Reminder',
    description: 'A shopper who left items in their pet-store cart, sent once when the ecomm team follows it up.',
    audience: 'USER',
    category: 'marketing',
    fires: 'An operator sends a reminder for an abandoned cart',
    subject: 'Your pet store cart is waiting',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The shopper’s name, or a friendly fallback.', 'there'),
      v('items', 'What is still in the cart.', 'Grain-free Puppy Food 3 kg × 1, Rope Toy × 2'),
      v('cart_url', 'The store’s cart page.', 'https://ecomm.duncit.com/cart'),
    ],
    body: {
      copyKey: 'email.storeCartReminder',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.order,
      calloutVar: 'items',
      ctaKey: CTA.viewCart,
      ctaVar: 'cart_url',
    },
  }),
];
