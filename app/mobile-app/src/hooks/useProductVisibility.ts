import { useEffect } from 'react';

import { useFeatureFlagsStore } from '@/stores/feature-flags.store';

/**
 * The one system flag that owns every product surface — the Pod Shop on a pod,
 * the cart, the catalogue, product orders and the E-commerce studio. Seeded
 * OFF: e-commerce stays invisible until an admin turns it on, and the server
 * refuses product operations while it is off.
 *
 * RN twin of mWeb's `useProductVisibility` (@duncit/app-settings) — rule 27.
 */
export const PRODUCT_VISIBILITY_FLAG = 'is_product_visible';

export interface ProductVisibility {
  /**
   * The flag set has not arrived yet. A screen gate has to WAIT on this rather
   * than send the user home: `visible` is false while loading, and a deep link
   * straight into the Shop would otherwise bounce before the answer landed.
   */
  pending: boolean;
  /** Product surfaces render. False while pending, so nothing ever flashes. */
  visible: boolean;
}

/** Reads the product kill switch. Everything product-shaped hangs off this. */
export function useProductVisibility(): ProductVisibility {
  const data = useFeatureFlagsStore((s) => s.data);
  const fetch = useFeatureFlagsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const flag = (data?.publicFeatureFlags ?? []).find(
    (item) => item.key === PRODUCT_VISIBILITY_FLAG,
  );
  return { pending: data === undefined, visible: flag?.enabled === true };
}
