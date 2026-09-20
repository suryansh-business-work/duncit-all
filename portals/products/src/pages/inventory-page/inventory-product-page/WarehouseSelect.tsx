import { useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { ListItemText, MenuItem, TextField } from '@mui/material';
import { useController, useFormContext } from 'react-hook-form';
import { BRAND_PICKUP_LOCATIONS } from '../../ecomm/queries';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

const DUNCIT_OWNER = { owner_kind: 'DUNCIT', brand_doc_id: null };

interface PickupOption {
  id: string;
  nickname: string;
  city: string;
  is_default: boolean;
  shiprocket_registered: boolean;
}

/**
 * The warehouse a product's parcel leaves from — and so the origin ShipRocket
 * quotes and collects from. Only an address on the ShipRocket account can be
 * chosen: one it does not hold is shown, but not selectable, because a product
 * pointing at it books an order no courier ever comes for.
 */
export default function WarehouseSelect() {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  const { field, fieldState } = useController({ control, name: 'pickup_location_id' });
  const { data, loading } = useQuery<any>(BRAND_PICKUP_LOCATIONS, {
    variables: DUNCIT_OWNER,
    fetchPolicy: 'cache-and-network',
  });
  const locations: PickupOption[] = useMemo(() => data?.brandPickupLocations ?? [], [data]);
  const ready = useMemo(() => locations.filter((loc) => loc.shiprocket_registered), [locations]);

  // New product (nothing chosen yet): preselect the default warehouse ShipRocket
  // can collect from, else the first one that it can.
  useEffect(() => {
    if (field.value || ready.length === 0) return;
    field.onChange((ready.find((loc) => loc.is_default) ?? ready[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const emptyHint = !loading && ready.length === 0 ? t('products.pickup.noReadyWarehouses') : ' ';

  return (
    <TextField
      select
      fullWidth
      required
      label={t('products.media.warehouse')}
      value={field.value}
      onChange={(event) => field.onChange(event.target.value)}
      onBlur={field.onBlur}
      inputRef={field.ref}
      error={!!fieldState.error}
      helperText={fieldState.error?.message ?? emptyHint}
      disabled={loading && locations.length === 0}
      data-testid="product-pickup-location"
    >
      {locations.map((loc) => (
        <MenuItem key={loc.id} value={loc.id} disabled={!loc.shiprocket_registered}>
          <ListItemText
            primary={`${loc.nickname} — ${loc.city}${loc.is_default ? ` (${t('products.pickup.default')})` : ''}`}
            secondary={loc.shiprocket_registered ? undefined : t('products.pickup.warehouseNotInShiprocket')}
          />
        </MenuItem>
      ))}
    </TextField>
  );
}
