/**
 * Routes that are product-specific and therefore hidden behind the
 * `is_product_visible` feature flag. The Dashboard (`/`) is always available.
 */
const PRODUCT_ROUTE_PREFIXES = ['/inventory', '/ecomm'] as const;

export function isProductNavItem(path: string): boolean {
  return PRODUCT_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}
