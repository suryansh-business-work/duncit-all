import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  DELETE_MY_WAREHOUSE, SET_DEFAULT_MY_WAREHOUSE, SET_MY_WAREHOUSE_ACTIVE, type BrandWarehouse,
} from '../warehouse.queries';
import type { PickupRemoval } from './DeleteWarehouseDialog';

/** What the page tells the partner after an action: a confirmation, or the server's own refusal. */
export interface PickupNotice {
  severity: 'success' | 'error';
  text: string;
}

/**
 * The actions on an existing pickup address: make it primary, switch it on or
 * off, delete it. Disabling and deleting go through a confirmation that first
 * shows what still ships from the address (`removal`). A refusal is shown in
 * the server's words — it names the products to move.
 */
export function usePickupActions(brandId: string, refetch: () => Promise<unknown>) {
  const { t } = useTranslation();
  const [deleteWarehouse, deleteState] = useMutation(DELETE_MY_WAREHOUSE);
  const [setDefaultWarehouse, defaultState] = useMutation(SET_DEFAULT_MY_WAREHOUSE);
  const [setActiveWarehouse, activeState] = useMutation(SET_MY_WAREHOUSE_ACTIVE);
  const [removal, setRemoval] = useState<PickupRemoval | null>(null);
  const [notice, setNotice] = useState<PickupNotice | null>(null);

  /** Run one mutation, say how it went, and reload the list either way it changed. */
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setNotice({ severity: 'success', text: done });
      await refetch();
    } catch (error) {
      setNotice({ severity: 'error', text: parseApiError(error) });
    }
  };

  const setActive = (warehouse: BrandWarehouse, active: boolean) =>
    run(
      () => setActiveWarehouse({ variables: { brand_doc_id: brandId, id: warehouse.id, active } }),
      active
        ? t('partners.warehouses.enabledDone', { vars: { name: warehouse.nickname } })
        : t('partners.warehouses.disabledDone', { vars: { name: warehouse.nickname } }),
    );

  return {
    removal,
    notice,
    setNotice,
    busy: deleteState.loading || defaultState.loading || activeState.loading,
    removing: deleteState.loading || activeState.loading,
    askDelete: (warehouse: BrandWarehouse) => setRemoval({ warehouse, action: 'delete' }),
    cancelRemoval: () => setRemoval(null),
    makeDefault: (warehouse: BrandWarehouse) =>
      run(
        () => setDefaultWarehouse({ variables: { brand_doc_id: brandId, id: warehouse.id } }),
        t('partners.warehouses.madePrimary', { vars: { name: warehouse.nickname } }),
      ),
    /** Switching on is immediate; switching off asks first, with the products that would be stranded. */
    toggleActive: (warehouse: BrandWarehouse, active: boolean) => {
      if (active) return setActive(warehouse, true);
      setRemoval({ warehouse, action: 'disable' });
      return Promise.resolve();
    },
    confirmRemoval: async () => {
      if (!removal) return;
      const { warehouse, action } = removal;
      if (action === 'disable') await setActive(warehouse, false);
      else {
        await run(
          () => deleteWarehouse({ variables: { brand_doc_id: brandId, id: warehouse.id } }),
          t('partners.ecommBrandPage.warehouseDeleted'),
        );
      }
      setRemoval(null);
    },
  };
}
