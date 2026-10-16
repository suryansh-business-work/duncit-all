import { useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { ListItemText, MenuItem, TextField } from '@mui/material';
import { useController, useFormContext, useWatch } from 'react-hook-form';
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
  /** Switched on. Absent on an older answer, which reads as active. */
  is_active?: boolean;
  /** A partner warehouse is usable only once approved; Duncit's always are. */
  review_status?: string;
}

const isApproved = (loc: PickupOption) => (loc.review_status ?? 'APPROVED') === 'APPROVED';

/** Whether a product may be pointed at this warehouse. */
const isReady = (loc: PickupOption) => loc.shiprocket_registered && loc.is_active !== false && isApproved(loc);

/** Why a listed warehouse cannot be chosen, if that is the reason shown. */
function warehouseNote(loc: PickupOption, t: ReturnType<typeof useTranslation>['t']) {
  if (!loc.shiprocket_registered) return t('products.pickup.warehouseNotInShiprocket');
  if (!isApproved(loc)) return t('products.pickup.awaitingApproval');
  return undefined;
}

/**
 * The warehouse a product's parcel leaves from — Duncit's, or the brand's own
 * when the product is being added to a brand's catalogue — and so the origin
 * ShipRocket quotes and collects from. Only an address on the ShipRocket
 * account can be chosen: one it does not hold is shown, but not selectable,
 * because a product pointing at it books an order no courier ever comes for.
 */
export default function WarehouseSelect() {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  const { field, fieldState } = useController({ control, name: 'pickup_location_id' });
  const newBrandId = useWatch({ control, name: 'new_brand_id' });
  const { data, loading } = useQuery<any>(BRAND_PICKUP_LOCATIONS, {
    variables: newBrandId ? { owner_kind: 'BRAND', brand_doc_id: newBrandId } : DUNCIT_OWNER,
    fetchPolicy: 'cache-and-network',
  });
  const locations: PickupOption[] = useMemo(() => data?.brandPickupLocations ?? [], [data]);
  const ready = useMemo(() => locations.filter(isReady), [locations]);

  // New product (nothing chosen yet): preselect the default warehouse ShipRocket
  // can collect from, else the first one that it can.
  useEffect(() => {
    if (field.value || ready.length === 0) return;
    field.onChange((ready.find((loc) => loc.is_default) ?? ready[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const noneReady = newBrandId ? t('products.pickup.noReadyBrandWarehouses') : t('products.pickup.noReadyWarehouses');
  const emptyHint = !loading && ready.length === 0 ? noneReady : ' ';
  // Hoisted out of the option label below: a template literal nested inside
  // another one is unreadable, and Sonar refuses it (S4624).
  const defaultTag = ` (${t('products.pickup.default')})`;

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
        <MenuItem key={loc.id} value={loc.id} disabled={!isReady(loc)}>
          <ListItemText
            primary={`${loc.nickname} — ${loc.city}${loc.is_default ? defaultTag : ''}`}
            secondary={warehouseNote(loc, t)}
          />
        </MenuItem>
      ))}
    </TextField>
  );
}
