import { Stack, Typography } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { PackagingFields } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { InventoryProductFormValues } from './types';

/**
 * "Shipping & packaging": the packed parcel of one unit (weight and L × B × H,
 * box included), its package type, HSN code, handling flags and shelf life.
 * ShipRocket rates and bills these numbers, so the schema requires the parcel
 * and HSN code once the delivery method is ShipRocket.
 */
export default function ShippingPackagingSection() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<InventoryProductFormValues>();
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('packaging.intro')}
      </Typography>
      <PackagingFields control={control} setValue={setValue} t={t} productFields />
    </Stack>
  );
}
