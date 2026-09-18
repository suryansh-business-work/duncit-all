import { STORE_URL } from '../runtime';

/** Addresses on the storefront this console manages — the same shapes the store routes. */
export const storeLinks = {
  home: (): string => STORE_URL,
  product: (slug: string): string => STORE_URL + '/p/' + encodeURIComponent(slug),
  collection: (slug: string): string => STORE_URL + '/collections/' + encodeURIComponent(slug),
};
