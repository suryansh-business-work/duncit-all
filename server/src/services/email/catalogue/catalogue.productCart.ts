import { CALM } from './mjml';
import { CTA, FOOTER, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * The Pod Shop cart (mWeb + the app). Separate from the pet store's
 * `store-cart-reminder` — a different product with a different cart (rule 65).
 */
export const PRODUCT_CART_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'product-cart-reminder',
    name: 'Pod Shop — Your Cart Is Calling',
    description:
      'A member whose Pod Shop cart still holds products. Timing, repeats and the cap are set in Products portal > Cart > Cart Settings; any change to the cart starts the count over and checkout stops it.',
    audience: 'USER',
    category: 'marketing',
    fires: 'The cart reminder sweep finds a cart left unchanged past the configured delay',
    subject: 'Your cart is calling',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The member’s first name, or a friendly fallback.', 'Aarav'),
      v('items', 'What is still in the cart, with quantities.', 'Duncit Water Bottle × 1, Club Tee × 2'),
      v('item_count', 'How many units are waiting in total.', '3'),
      v('cart_url', 'The cart page, where checkout starts.', 'https://mweb.duncit.com/cart'),
    ],
    body: {
      copyKey: 'email.productCartReminder',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.product,
      calloutVar: 'items',
      ctaKey: CTA.viewCart,
      ctaVar: 'cart_url',
    },
  }),
];
