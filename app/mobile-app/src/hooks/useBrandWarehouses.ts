import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MyBrandOptionsDocument,
  MyBrandWarehousesDocument,
  SyncMyBrandWarehousesDocument,
} from '@/graphql/brand-warehouses';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';

export type BrandOption = ResultOf<typeof MyBrandOptionsDocument>['myEcommBrands'][number];
export type BrandWarehouse = ResultOf<
  typeof MyBrandWarehousesDocument
>['myBrandPickupLocations'][number];
export type BrandPickupSync = ResultOf<
  typeof SyncMyBrandWarehousesDocument
>['syncMyBrandPickupLocations'];

/**
 * The partner's brands, the picked one (the first until another is picked) and
 * its warehouses, plus the ShipRocket sync — whose answer replaces the list, so
 * pickups it took in from ShipRocket show at once. RN twin of mWeb's
 * useBrandWarehouses.
 */
export function useBrandWarehouses() {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [picked, setPicked] = useState('');
  const [warehouses, setWarehouses] = useState<BrandWarehouse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [outcome, setOutcome] = useState<BrandPickupSync | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const brandId = brands.find((b) => b.id === picked)?.id ?? brands[0]?.id ?? '';
  const onError = (err: unknown) =>
    setError(toErrorMessage(err, t('mweb.brandWarehouses.loadFailed')));

  const loadBrands = useCallback(async () => {
    const data = await graphqlRequest(MyBrandOptionsDocument, undefined, { auth: true });
    setBrands(data.myEcommBrands);
    setError(null);
  }, []);
  const brandsQuery = useReloadableQuery(loadBrands, { onError });

  const loadWarehouses = useCallback(async () => {
    const data = await graphqlRequest(MyBrandWarehousesDocument, { brandId }, { auth: true });
    setWarehouses(data.myBrandPickupLocations);
    setError(null);
  }, [brandId]);
  const list = useReloadableQuery(loadWarehouses, { enabled: !!brandId, onError });

  return {
    brands,
    brandId,
    warehouses,
    isLoading: brandsQuery.isLoading || (!!brandId && list.isLoading),
    error,
    syncing,
    outcome,
    syncError,
    selectBrand: (id: string) => {
      setPicked(id);
      setOutcome(null);
      setSyncError(null);
    },
    retry: () => {
      // A failed reload lands in `error` through onError; this only hands the promise off.
      fireAndForget(brandId ? list.refetch() : brandsQuery.refetch());
    },
    sync: async () => {
      setSyncing(true);
      setOutcome(null);
      setSyncError(null);
      try {
        const data = await graphqlRequest(
          SyncMyBrandWarehousesDocument,
          { brandId },
          { auth: true },
        );
        setWarehouses(data.syncMyBrandPickupLocations.warehouses);
        setOutcome(data.syncMyBrandPickupLocations);
      } catch (err) {
        setSyncError(toErrorMessage(err, t('mweb.brandOrders.actionFailed')));
      } finally {
        setSyncing(false);
      }
    },
  };
}
