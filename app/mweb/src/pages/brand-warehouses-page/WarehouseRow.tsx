import { Chip, Stack, Typography } from '@mui/material';
import {
  PICKUP_SHIPROCKET_STATE_KEYS,
  PICKUP_SHIPROCKET_TONE,
  pickupReview,
  pickupShiprocketState,
  TONE_CHIP_COLOR,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { BrandWarehouse } from './queries';

/** One warehouse: nickname, address, whether it is the default, its review and
 * where it stands with ShipRocket (and why, when it is not ready). Native twin:
 * components/brand-warehouses/WarehouseRow. */
export default function WarehouseRow({ warehouse: w }: Readonly<{ warehouse: BrandWarehouse }>) {
  const { t } = useTranslation();
  const review = pickupReview(w.review_status);
  const state = pickupShiprocketState(w);
  const address = [w.address_line1, w.address_line2, w.city, w.state, w.pincode].filter(Boolean).join(', ');
  return (
    <Stack spacing={0.75} sx={{ p: 2 }} data-testid={`brand-warehouse-${w.id}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography sx={{ fontWeight: 700 }}>{w.nickname}</Typography>
        {w.is_default && <Chip size="small" variant="outlined" color="primary" label={t('mweb.brandWarehouses.isDefault')} />}
      </Stack>
      {address && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{address}</Typography>}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Chip size="small" color={TONE_CHIP_COLOR[review.tone]} label={t(review.key)} data-testid={`brand-warehouse-review-${w.id}`} />
        <Chip
          size="small"
          color={TONE_CHIP_COLOR[PICKUP_SHIPROCKET_TONE[state]]}
          label={t(PICKUP_SHIPROCKET_STATE_KEYS[state])}
          data-testid={`brand-warehouse-shiprocket-${w.id}`}
        />
      </Stack>
      {w.shiprocket_error && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid={`brand-warehouse-error-${w.id}`}>
          {w.shiprocket_error}
        </Typography>
      )}
    </Stack>
  );
}
