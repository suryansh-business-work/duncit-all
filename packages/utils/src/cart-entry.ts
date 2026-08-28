/**
 * The cart entry point's DERIVATION — the one place mWeb and the native app
 * agree on when the header cart shows, what its badge reads and how it is
 * labelled (CLAUDE.md rules 27 + 34).
 *
 * Only the derivation is shared: mWeb renders it with MUI, native with Tamagui
 * (rule 29), so no icon, colour or prop name lives here.
 */

/** Highest number the badge prints before it collapses to "99+". */
export const CART_BADGE_MAX = 99;

/**
 * Routes that ARE the cart flow. The cart is already on screen there (or is
 * being paid for), so a header entry point back into it is redundant. Both
 * spellings are listed because mWeb routes by kebab-case path and native by
 * PascalCase screen name.
 */
const CART_FLOW_KEYS = new Set(['cart', 'checkout', 'productcheckout', 'product-checkout']);

/**
 * Reduce a web pathname (`/product-checkout/pod-1`) or a native route name
 * (`ProductCheckout`) to one comparable key, so both surfaces hide the entry
 * point on exactly the same screens.
 */
function routeKey(route: string): string {
  const [first = ''] = route.replace(/^\/+/, '').split('/');
  return first.toLowerCase();
}

/** True on the cart, the pod checkout and the product checkout. */
export function isCartFlowRoute(route: string): boolean {
  return CART_FLOW_KEYS.has(routeKey(route));
}

/** Badge text for a unit count, capped so the pill keeps its size. */
export function cartBadgeLabel(count: number): string {
  return count > CART_BADGE_MAX ? `${CART_BADGE_MAX}+` : String(count);
}

export interface CartEntry {
  /** Render the entry point at all: something to open, somewhere it helps. */
  visible: boolean;
  /** Total units in the cart. */
  count: number;
  /** Capped badge text. */
  badge: string;
}

/**
 * Everything a cart entry point needs, from the cart's unit count and the route
 * it would render on. An empty cart has nothing to open; the cart flow already
 * shows the cart.
 */
export function deriveCartEntry(count: number, route: string): CartEntry {
  return {
    visible: count > 0 && !isCartFlowRoute(route),
    count,
    badge: cartBadgeLabel(count),
  };
}
