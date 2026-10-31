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

/** A route path as a whole-pathname pattern; a trailing slash is allowed. */
const toPattern = (path: string): RegExp => new RegExp(`^${path.replaceAll(/:[A-Za-z]+/g, '[^/]+')}/?$`);

const PATTERNS = Object.values(STORE_PATHS).map(toPattern);

/** True when the router has a page for this pathname. */
export const isStorePath = (pathname: string): boolean => PATTERNS.some((pattern) => pattern.test(pathname));

/**
 * The public pages the server renders in full (src/entry-server.tsx): the ones
 * a search engine indexes. Cart, checkout, account and the rest belong to one
 * shopper, so they stay rendered in the browser alone.
 */
const SERVER_RENDERED: ReadonlyArray<keyof typeof STORE_PATHS> = [
  'home',
  'shop',
  'deals',
  'petType',
  'category',
  'collection',
  'brands',
  'brand',
  'product',
  'page',
  'contact',
];

const SERVER_RENDERED_PATTERNS = SERVER_RENDERED.map((key) => toPattern(STORE_PATHS[key]));

/** True for a public page the server renders before the browser takes over. */
export const isServerRenderedPath = (pathname: string): boolean => SERVER_RENDERED_PATTERNS.some((pattern) => pattern.test(pathname));
