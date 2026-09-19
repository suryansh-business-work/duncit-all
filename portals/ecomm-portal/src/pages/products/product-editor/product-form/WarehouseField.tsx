import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert, ListItemText, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Translate } from '../../../../lib/translate';
import { STORE_WAREHOUSES, type StoreWarehouse } from '../../queries';
import type { ProductControl } from './product.types';

const placeOf = (warehouse: StoreWarehouse, t: Translate) =>
  t('ecommPortal.productEditor.warehouseOption', {
    vars: { nickname: warehouse.nickname, city: warehouse.city, pincode: warehouse.pincode },
  });

/** Whether ShipRocket can collect from it — and whether it is the store's default. */
const readinessOf = (warehouse: StoreWarehouse, t: Translate) => {
  const ready = warehouse.shiprocket_ready
    ? t('ecommPortal.productEditor.shiprocketReady')
    : t('ecommPortal.productEditor.shiprocketNotReady');
  return warehouse.is_default ? t('ecommPortal.productEditor.defaultWarehouse', { vars: { ready } }) : ready;
};

/** Which of Duncit's own warehouses the parcel leaves from — needed to publish. */
export default function WarehouseField({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  const { data, loading } = useQuery(STORE_WAREHOUSES, { fetchPolicy: 'cache-and-network' });
  const chosenId = useWatch({ control, name: 'warehouse_id' });
  const warehouses = useMemo(() => data?.storeAdminWarehouses ?? [], [data]);
  const byId = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse])), [warehouses]);
  const chosen = byId.get(chosenId);

  if (!loading && warehouses.length === 0) {
    return (
      <Alert severity="info" data-testid="product-no-warehouses">
        {t('ecommPortal.productEditor.noWarehouses')}
      </Alert>
    );
  }
  const renderValue = (value: unknown) => {
    const warehouse = byId.get(String(value));
    return warehouse ? placeOf(warehouse, t) : '';
  };
  return (
    <Stack spacing={1}>
      <RhfTextField
        control={control}
        name="warehouse_id"
        label={t('ecommPortal.productEditor.warehouse')}
        hint={t('ecommPortal.productEditor.neededToPublish')}
        select
        slotProps={{ select: { renderValue } }}
        data-testid="product-warehouse"
      >
        <MenuItem value="">{t('ecommPortal.productEditor.noWarehouse')}</MenuItem>
        {warehouses.map((warehouse) => (
          <MenuItem key={warehouse.id} value={warehouse.id}>
            <ListItemText primary={placeOf(warehouse, t)} secondary={readinessOf(warehouse, t)} />
          </MenuItem>
        ))}
      </RhfTextField>
      {chosen && !chosen.shiprocket_ready && (
        <Alert severity="warning" data-testid="product-warehouse-not-ready">
          {t('ecommPortal.productEditor.warehouseNotReady')}
        </Alert>
      )}
    </Stack>
  );
}
