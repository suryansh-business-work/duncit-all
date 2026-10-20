import { STORE_URL } from '../runtime';

/** Addresses on the storefront this console manages — the same shapes the store routes. */
export const storeLinks = {
  home: (): string => STORE_URL,
  deals: (): string => STORE_URL + '/deals',
  product: (slug: string): string => STORE_URL + '/p/' + encodeURIComponent(slug),
  collection: (slug: string): string => STORE_URL + '/collections/' + encodeURIComponent(slug),
  /** The home page wearing a festive theme, whatever the date — for checking a look before it goes live. */
  preview: (theme: string): string => STORE_URL + '/?occasion=' + encodeURIComponent(theme),
};
