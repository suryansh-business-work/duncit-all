import type { CartLine } from '../../components/cart/CartContext';
import { toCheckoutContact, toCheckoutBilling, type PostalAddressParts } from '../checkout-page/checkout';
import type { CheckoutForm, ProductCartItemInput } from '../checkout-page/queries';

/** Cart lines (across pods) → the product engine's cart items. Each line keeps
 * its own pod (the per-pod stock gate still applies) and its chosen variant. */
export const mapLinesToItems = (lines: CartLine[]): ProductCartItemInput[] =>
  lines.map((line) => ({
    product_id: line.product_id,
    pod_id: line.pod_id,
    quantity: line.quantity,
    ...(line.variant_id ? { variant_id: line.variant_id } : {}),
  }));

/** The products subtotal (variant-aware unit cost × quantity). */
export const productSubtotal = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0);

interface BuildContext {
  items: ProductCartItemInput[];
  mainAddress?: PostalAddressParts | null;
  couponCode: string | null;
  /** Duncit Coins the buyer chose to spend on this bill (already clamped to the
   * balance and the payable). Omitted means none — the server clamps again. */
  redeemCoins?: number;
  /** Contact saved on the picked address-book entry — the parcel goes to this
   * person, so it wins over the (possibly phone-less) profile contact. */
  pickedContact?: { name: string; phone: string; email: string } | null;
}

/** Generic payment description for the combined cart: `Product order · N items`. */
export function productOrderDescription(items: ProductCartItemInput[]): string {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return `Product order · ${count} item${count === 1 ? '' : 's'}`;
}

/** Build the `ProductCheckoutInput` payload from the checkout form. Shipping
 * delivers to the address entered here; the server recomputes live shipping and
 * creates the ProductOrder(s) as a side effect. Returns `simulate_failure`
 * separately so only the dummy gateway carries it. */
export function buildProductCheckoutInput(values: CheckoutForm, ctx: BuildContext) {
  const { simulate_failure, ...contact } = toCheckoutContact(values);
  const billing = toCheckoutBilling(values, ctx.mainAddress);
  const formPhone = values.phone_number.trim()
    ? `${values.phone_extension} ${values.phone_number}`.trim()
    : '';
  const picked = ctx.pickedContact;
  const shipping_address = {
    name: picked?.name || values.full_name,
    phone: picked?.phone || formPhone,
    email: picked?.email || values.email,
    line1: values.line1,
    line2: values.line2 || '',
    landmark: values.landmark || '',
    city: values.city,
    state: values.state,
    pincode: values.pincode,
    country: values.country || 'India',
  };
  const input = {
    items: ctx.items,
    description: productOrderDescription(ctx.items),
    ...contact,
    billing,
    shipping_address,
    delivery_pincode: values.pincode,
    checkout_url: globalThis.window.location.href,
    coupon_code: ctx.couponCode,
    redeem_coins: ctx.redeemCoins ?? 0,
  };
  return { input, simulate_failure };
}
