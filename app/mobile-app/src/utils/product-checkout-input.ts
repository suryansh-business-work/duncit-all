import type { CartLine } from '@/stores/cart.store';
import { buildCheckoutBilling } from '@/hooks/useCheckout';
import type { CheckoutFormValues, CheckoutMainAddress } from '@/forms/checkout';
import type { ProductCartItemInput, ProductCheckoutInput } from '@/generated/graphql/graphql';

/** Where the product order confirms back to (the mobile app has no web URL). */
const CHECKOUT_URL = 'duncit-mobile://product-checkout';

/** All cart lines → the product engine's cart items. Each line keeps its own
 * pod (the per-pod stock gate still applies) and its chosen variant. */
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
  mainAddress?: CheckoutMainAddress | null;
  couponCode: string | null;
}

/** Generic payment description for the combined cart, e.g. "Product order · 3 items". */
export const productOrderDescription = (items: ProductCartItemInput[]): string => {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const noun = count === 1 ? 'item' : 'items';
  return `Product order · ${count} ${noun}`;
};

interface BuiltProductCheckout {
  input: ProductCheckoutInput;
  simulate_failure: boolean;
}

/** Build the `ProductCheckoutInput` payload from the checkout form. Shipping
 * delivers to the address entered here; the server recomputes live shipping and
 * creates the ProductOrder(s) as a side effect. Returns `simulate_failure`
 * separately so only the dummy gateway carries it. RN twin of mWeb's
 * buildProductCheckoutInput. */
export function buildProductCheckoutInput(
  values: CheckoutFormValues,
  ctx: BuildContext,
): BuiltProductCheckout {
  const shipping_address = {
    name: values.full_name.trim(),
    phone: `${values.phone_extension} ${values.phone_number}`.trim(),
    email: values.email,
    line1: values.line1 ?? '',
    line2: values.line2 ?? '',
    landmark: values.landmark ?? '',
    city: values.city ?? '',
    state: values.state ?? '',
    pincode: values.pincode ?? '',
    country: values.country || 'India',
  };
  const input: ProductCheckoutInput = {
    items: ctx.items,
    description: productOrderDescription(ctx.items),
    contact_name: values.full_name.trim(),
    contact_email: values.email,
    contact_phone_extension: values.phone_extension,
    contact_phone_number: values.phone_number,
    billing: buildCheckoutBilling(values, ctx.mainAddress ?? null),
    shipping_address,
    delivery_pincode: values.pincode,
    checkout_url: CHECKOUT_URL,
    coupon_code: ctx.couponCode,
  };
  return { input, simulate_failure: values.simulate_failure };
}
