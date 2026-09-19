import { useQuery } from '@apollo/client/react';
import { PUBLIC_FEATURE_FLAGS } from './useFeatureFlag';

/**
 * The one system flag that owns every product surface — the Pod Shop on a pod,
 * the cart, the catalogue, brand + ShipRocket warehouse registration, product
 * orders and the E-commerce studio. Seeded OFF: e-commerce stays invisible
 * until an admin turns it on, and the server refuses product operations while
 * it is off, so a hidden button is never the only thing holding the line.
 */
export const PRODUCT_VISIBILITY_FLAG = 'is_product_visible';

export interface ProductVisibility {
  /**
   * The flag set has not arrived yet. A route gate has to WAIT on this rather
   * than redirect: `visible` is false while loading, and a deep link straight
   * into /shop would otherwise bounce home before the answer landed.
   */
  pending: boolean;
  /** Product surfaces render. False while pending, so nothing ever flashes. */
  visible: boolean;
}

/**
 * How often an open console re-reads the flag. An admin flips it in one tab
 * and expects the Products portal in another to grow its sidebar without a
 * reload; a minute matches the server's own response-cache TTL, so polling
 * faster would only re-read the cached answer.
 */
const REFRESH_MS = 60_000;

/**
 * Reads the product kill switch. Everything product-shaped hangs off this.
 *
 * `cache-and-network` rather than `cache-first`: the sidebar of a console that
 * stayed open across the flip used to keep the cached `false` for the whole
 * session — a reload was the only way to see the product menu — and the
 * first paint still answers from the cache, so nothing flashes.
 */
export function useProductVisibility(): ProductVisibility {
  const { data, loading } = useQuery<{
    publicFeatureFlags: { key: string; enabled: boolean }[];
  }>(PUBLIC_FEATURE_FLAGS, {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    pollInterval: REFRESH_MS,
  });
  const flag = (data?.publicFeatureFlags ?? []).find((f) => f.key === PRODUCT_VISIBILITY_FLAG);
  return { pending: loading && !data, visible: flag?.enabled === true };
}
