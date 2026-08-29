import { useQuery } from '@apollo/client';
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

/** Reads the product kill switch. Everything product-shaped hangs off this. */
export function useProductVisibility(): ProductVisibility {
  const { data, loading } = useQuery<{
    publicFeatureFlags: { key: string; enabled: boolean }[];
  }>(PUBLIC_FEATURE_FLAGS, { fetchPolicy: 'cache-first' });
  const flag = (data?.publicFeatureFlags ?? []).find((f) => f.key === PRODUCT_VISIBILITY_FLAG);
  return { pending: loading && !data, visible: flag?.enabled === true };
}
