import { useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { notify, notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { useConfirmDelete } from '../../../components/useConfirmDelete';
import { runAction } from '../../../lib/actions';
import { DELETE_WAREHOUSE, REGISTER_WAREHOUSE, SAVE_WAREHOUSE, type Warehouse, type WarehouseInput } from '../queries';

/** Every write re-reads the list, which re-reads ShipRocket — the state shown is always ShipRocket's own. */
const RELOAD = { refetchQueries: ['StorePickupLocations'], awaitRefetchQueries: true };

/**
 * The writes behind the pickup-address list. Adding one creates it on the
 * ShipRocket account first, so a save that comes back has an address the
 * account holds — and a save ShipRocket refuses saves nothing and says why.
 */
export function usePickupActions() {
  const { t } = useTranslation();
  const confirmDelete = useConfirmDelete();
  const [save, saveState] = useMutation(SAVE_WAREHOUSE, RELOAD);
  const [register, registerState] = useMutation(REGISTER_WAREHOUSE, RELOAD);
  const [remove, removeState] = useMutation(DELETE_WAREHOUSE, RELOAD);
  const busy = [saveState, registerState, removeState].some((state) => state.loading);

  const saveWarehouse = useCallback(
    async (id: string | null, input: WarehouseInput) => {
      try {
        await save({ variables: { id, input } });
        notify(t('ecommPortal.shipping.warehouseInShiprocket'), 'success');
        return true;
      } catch (error) {
        notifyError(parseApiError(error));
        return false;
      }
    },
    [save, t],
  );

  const deleteWarehouse = useCallback(
    async (warehouse: Warehouse) => {
      if (!(await confirmDelete(warehouse.nickname, t('ecommPortal.shipping.deleteWarehouseMessage')))) return;
      await runAction(() => remove({ variables: { id: warehouse.id } }), t('shell.common.deleted'));
    },
    [confirmDelete, remove, t],
  );

  // One stable object: the table's columns are built from it, and a new one each render would refetch the grid.
  return useMemo(
    () => ({
      busy,
      save: saveWarehouse,
      remove: deleteWarehouse,
      register: (warehouse: Warehouse) =>
        runAction(() => register({ variables: { id: warehouse.id } }), t('ecommPortal.shipping.addedToShiprocket')),
    }),
    [busy, saveWarehouse, deleteWarehouse, register, t],
  );
}

export type PickupActions = ReturnType<typeof usePickupActions>;
