import type { CartLine } from '../../components/cart/CartContext';
import { toCheckoutContact, toCheckoutBilling, type PostalAddressParts } from '../checkout-page/checkout';
import type { CheckoutForm, ProductCartItemInput } from '../checkout-page/queries';

/** Cart lines for one pod → the product engine's cart items. Each line keeps its
 * own pod (the per-pod stock gate still applies) and its chosen variant. */
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
  podTitle: string;
  mainAddress?: PostalAddressParts | null;
  couponCode: string | null;
}

/** Build the `ProductCheckoutInput` payload from the checkout form. Shipping
 * delivers to the address entered here; the server recomputes live shipping and
 * creates the ProductOrder(s) as a side effect. Returns `simulate_failure`
 * separately so only the dummy gateway carries it. */
export function buildProductCheckoutInput(values: CheckoutForm, ctx: BuildContext) {
  const { simulate_failure, ...contact } = toCheckoutContact(values);
  const billing = toCheckoutBilling(values, ctx.mainAddress);
  const shipping_address = {
    name: values.full_name,
    phone: `${values.phone_extension} ${values.phone_number}`.trim(),
    email: values.email,
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
    description: `Product order · ${ctx.podTitle}`,
    ...contact,
    billing,
    shipping_address,
    delivery_pincode: values.pincode,
    checkout_url: globalThis.window.location.href,
    coupon_code: ctx.couponCode,
  };
  return { input, simulate_failure };
}
