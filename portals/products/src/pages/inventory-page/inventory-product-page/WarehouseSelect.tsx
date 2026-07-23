import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { MenuItem, TextField } from '@mui/material';
import { useController, useFormContext } from 'react-hook-form';
import { BRAND_PICKUP_LOCATIONS } from '../../ecomm/queries';
import type { InventoryProductFormValues } from './types';

const DUNCIT_OWNER = { owner_kind: 'DUNCIT', brand_doc_id: null };

/** Required warehouse (Duncit pickup location) picker for the product form. The
 * chosen warehouse is the product's ShipRocket rate + shipment origin. */
export default function WarehouseSelect() {
  const { control } = useFormContext<InventoryProductFormValues>();
  const { field, fieldState } = useController({ control, name: 'pickup_location_id' });
  const { data, loading } = useQuery(BRAND_PICKUP_LOCATIONS, {
    variables: DUNCIT_OWNER,
    fetchPolicy: 'cache-and-network',
  });
  const locations = data?.brandPickupLocations ?? [];

  // New product (nothing chosen yet): preselect the default Duncit warehouse
  // (or the first one). `locations` is non-empty here, so `locations[0]` exists.
  useEffect(() => {
    if (field.value || locations.length === 0) return;
    const preset = locations.find((loc: any) => loc.is_default) ?? locations[0];
    field.onChange(preset.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  const emptyHint =
    !loading && locations.length === 0
      ? 'No Duncit warehouses yet — add one in Settings › Duncit Warehouse Locations.'
      : ' ';

  return (
    <TextField
      select
      fullWidth
      required
      label="Warehouse"
      value={field.value}
      onChange={(event) => field.onChange(event.target.value)}
      onBlur={field.onBlur}
      inputRef={field.ref}
      error={!!fieldState.error}
      helperText={fieldState.error?.message ?? emptyHint}
      disabled={loading && locations.length === 0}
    >
      {locations.map((loc: any) => (
        <MenuItem key={loc.id} value={loc.id}>
          {loc.nickname} — {loc.city}
          {loc.is_default ? ' (default)' : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
