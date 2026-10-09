import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import { notifyError } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import {
  MY_BRAND_OPTIONS,
  MY_BRAND_WAREHOUSES,
  SYNC_MY_BRAND_WAREHOUSES,
  type BrandPickupSync,
} from './queries';

/**
 * The partner's brands, the picked one (in the URL, else the first) and its
 * warehouses, plus the ShipRocket sync. A sync's answer is written over the
 * cached list, so warehouses it took in from ShipRocket show at once. Native
 * twin: hooks/useBrandWarehouses.
 */
export function useBrandWarehouses() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const brandsQuery = useQuery(MY_BRAND_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const brands = brandsQuery.data?.myEcommBrands ?? [];
  const picked = params.get('brand');
  const brandId = brands.find((b) => b.id === picked)?.id ?? brands[0]?.id ?? '';
  const list = useQuery(MY_BRAND_WAREHOUSES, {
    variables: { brandId },
    skip: !brandId,
    fetchPolicy: 'cache-and-network',
  });
  const [sync, syncing] = useMutation(SYNC_MY_BRAND_WAREHOUSES);
  const [outcome, setOutcome] = useState<{ brandId: string; result: BrandPickupSync } | null>(null);

  return {
    brands,
    brandId,
    brandsLoading: brandsQuery.loading && !brandsQuery.data,
    brandsError: brandsQuery.error,
    warehouses: list.data?.myBrandPickupLocations ?? [],
    loading: list.loading && !list.data,
    error: list.error,
    retry: () => {
      const again = brandId ? list.refetch() : brandsQuery.refetch();
      again.catch(() => undefined);
    },
    selectBrand: (id: string) => setParams(new URLSearchParams({ brand: id }), { replace: true }),
    syncing: syncing.loading,
    /** This brand's last sync answer — a different brand's is not shown. */
    outcome: outcome?.brandId === brandId ? outcome.result : null,
    sync: async () => {
      try {
        const { data } = await sync({
          variables: { brandId },
          update: (cache, { data: synced }) => {
            if (!synced) return;
            cache.writeQuery({
              query: MY_BRAND_WAREHOUSES,
              variables: { brandId },
              data: { myBrandPickupLocations: synced.syncMyBrandPickupLocations.warehouses },
            });
          },
        });
        if (data) setOutcome({ brandId, result: data.syncMyBrandPickupLocations });
      } catch (error) {
        notifyError(parseApiError(error, t('mweb.brandOrders.actionFailed')));
      }
    },
  };
}
