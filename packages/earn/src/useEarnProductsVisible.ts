import { useQuery } from '@apollo/client';
import { PUBLIC_FEATURE_FLAGS } from './queries';

interface PublicFlag {
  key: string;
  enabled: boolean;
}

/**
 * Whether the product-seller journey is visible (`is_product_visible` public
 * flag). Defaults to hidden while loading or when the flag is missing — the
 * same semantics as mWeb's generic `useFeatureFlag`, exported here so a portal
 * consumer doesn't grow a third copy of the flags hook.
 */
export function useEarnProductsVisible(): boolean {
  const { data } = useQuery<{ publicFeatureFlags: PublicFlag[] }>(PUBLIC_FEATURE_FLAGS, {
    fetchPolicy: 'cache-first',
  });
  const flag = (data?.publicFeatureFlags ?? []).find((f) => f.key === 'is_product_visible');
  return flag?.enabled === true;
}
