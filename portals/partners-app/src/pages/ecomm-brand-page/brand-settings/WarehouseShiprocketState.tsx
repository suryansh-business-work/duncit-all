import { Chip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PICKUP_SHIPROCKET_STATE_KEYS, PICKUP_SHIPROCKET_TONE, pickupShiprocketState, TONE_CHIP_COLOR } from '@duncit/utils';
import type { BrandWarehouse } from './warehouse.queries';

type Props = Readonly<{ warehouse: Pick<BrandWarehouse, 'shiprocket_registered' | 'shiprocket_error'> }>;

/** Whether ShipRocket can pick up from this warehouse — the same rule mWeb and the native Studio read. */
export function WarehouseShiprocketChip({ warehouse }: Props) {
  const { t } = useTranslation();
  const state = pickupShiprocketState(warehouse);
  return (
    <Chip
      size="small"
      variant="outlined"
      color={TONE_CHIP_COLOR[PICKUP_SHIPROCKET_TONE[state]]}
      label={t(PICKUP_SHIPROCKET_STATE_KEYS[state])}
    />
  );
}

/** ShipRocket's reason, when the warehouse is not ready to ship from. */
export function WarehouseShiprocketNote({ warehouse }: Props) {
  if (!warehouse.shiprocket_error) return null;
  return (
    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
      {warehouse.shiprocket_error}
    </Typography>
  );
}
