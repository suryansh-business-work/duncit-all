import { Alert, Grid, InputAdornment } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import RhfNumberField from './RhfNumberField';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { InventoryProductFormValues } from './types';

const rupee = <InputAdornment position="start">₹</InputAdornment>;
const percent = <InputAdornment position="end">%</InputAdornment>;

export default function PricingTaxSection() {
  const { control } = useFormContext<InventoryProductFormValues>();
  const sellingPrice = useWatch({ control, name: 'selling_price' });
  const discountPercent = useWatch({ control, name: 'discount_percent' });
  const taxPercent = useWatch({ control, name: 'tax_percent' });

  const net =
    (sellingPrice ?? 0) * (1 - (discountPercent ?? 0) / 100) * (1 + (taxPercent ?? 0) / 100);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <RhfNumberField
          control={control}
          required
          name="unit_cost"
          label="Unit cost"
          hint="Reference cost for internal accounting"
          InputProps={{ startAdornment: rupee }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfNumberField
          control={control}
          required
          name="purchase_price"
          label="Purchase price"
          hint="What you pay the supplier"
          InputProps={{ startAdornment: rupee }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfNumberField
          control={control}
          required
          name="selling_price"
          label="Selling price"
          hint="Listed price before tax / discount"
          InputProps={{ startAdornment: rupee }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfNumberField
          control={control}
          required
          name="tax_percent"
          label="Tax / GST %"
          hint="0, 5, 12, 18 or 28"
          InputProps={{ endAdornment: percent }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfNumberField
          control={control}
          required
          name="discount_percent"
          label="Discount %"
          hint="0 if no promotion"
          InputProps={{ endAdornment: percent }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfTextField
          control={control}
          name="weight_volume"
          label="Weight / Volume"
          hint='Free-form, e.g. "500 ml", "1 kg"'
        />
      </Grid>
      <Grid item xs={12}>
        <Alert severity="info">
          Effective price after discount &amp; tax: <strong>₹{net.toFixed(2)}</strong>
        </Alert>
      </Grid>
    </Grid>
  );
}
