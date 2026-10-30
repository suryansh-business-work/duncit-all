/**
 * Every address the storefront answers. The router mounts its pages on these,
 * and the HTML server uses the same list to answer any other address with a
 * real 404 instead of the shell at 200 — one list, so the two cannot disagree.
 */
export const STORE_PATHS = {
  home: '/',
  shop: '/shop',
  search: '/search',
  deals: '/deals',
  petType: '/pet/:slug',
  category: '/c/:slug',
  collection: '/collections/:slug',
  brands: '/brands',
  brand: '/brand/:slug',
  product: '/p/:slug',
  cart: '/cart',
  checkout: '/checkout',
  orderSuccess: '/order/success',
  account: '/account',
  orders: '/account/orders',
  order: '/account/orders/:orderNo',
  addresses: '/account/addresses',
  returns: '/account/returns',
  petProfile: '/account/pet',
  autoship: '/autoship',
  wishlist: '/wishlist',
  track: '/track',
  page: '/pages/:slug',
  contact: '/contact',
} as const;

const PATTERNS = Object.values(STORE_PATHS).map(
  (path) => new RegExp(`^${path.replaceAll(/:[A-Za-z]+/g, '[^/]+')}/?$`),
);

/** True when the router has a page for this pathname. */
export const isStorePath = (pathname: string): boolean => PATTERNS.some((pattern) => pattern.test(pathname));
