import { Alert, Grid, InputAdornment } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import RhfNumberField from './RhfNumberField';
import { RhfTextField } from '@duncit/forms';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

const rupee = <InputAdornment position="start">₹</InputAdornment>;
const percent = <InputAdornment position="end">%</InputAdornment>;

export default function PricingTaxSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  const sellingPrice = useWatch({ control, name: 'selling_price' });
  const discountPercent = useWatch({ control, name: 'discount_percent' });
  const taxPercent = useWatch({ control, name: 'tax_percent' });

  const net =
    (sellingPrice ?? 0) * (1 - (discountPercent ?? 0) / 100) * (1 + (taxPercent ?? 0) / 100);

  return (
    <Grid container spacing={2}>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfNumberField
          control={control}
          required
          name="unit_cost"
          label={t('products.pricing.unitCost')}
          hint="Reference cost for internal accounting"
          slotProps={{ input: { startAdornment: rupee } }}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfNumberField
          control={control}
          required
          name="purchase_price"
          label={t('products.pricing.purchasePrice')}
          hint="What you pay the supplier"
          slotProps={{ input: { startAdornment: rupee } }}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfNumberField
          control={control}
          required
          name="selling_price"
          label={t('products.pricing.sellingPrice')}
          hint="Listed price before tax / discount"
          slotProps={{ input: { startAdornment: rupee } }}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfNumberField
          control={control}
          required
          name="tax_percent"
          label={t('products.pricing.taxGst')}
          hint="0, 5, 12, 18 or 28"
          slotProps={{ input: { endAdornment: percent } }}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfNumberField
          control={control}
          required
          name="discount_percent"
          label={t('products.pricing.discount')}
          hint="0 if no promotion"
          slotProps={{ input: { endAdornment: percent } }}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfTextField
          control={control}
          name="weight_volume"
          label={t('products.pricing.weightVolume')}
          hint='Free-form, e.g. "500 ml", "1 kg"'
        />
      </Grid>
      <Grid size={12}>
        <Alert severity="info">
          Effective price after discount &amp; tax: <strong>₹{net.toFixed(2)}</strong>
        </Alert>
      </Grid>
    </Grid>
  );
}
