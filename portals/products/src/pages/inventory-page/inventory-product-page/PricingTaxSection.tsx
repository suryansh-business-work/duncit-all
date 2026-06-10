import { Alert, Grid, InputAdornment, TextField } from '@mui/material';
import { useFormikContext } from 'formik';
import type { InventoryProductFormValues } from './types';

const num = (v: any) => (v === '' ? 0 : Number(v));

export default function PricingTaxSection() {
  const f = useFormikContext<InventoryProductFormValues>();
  const showError = (k: keyof InventoryProductFormValues) =>
    !!(f.touched[k] && f.errors[k]);
  const helper = (k: keyof InventoryProductFormValues, fb: string) =>
    (f.touched[k] && (f.errors[k] as string)) || fb;

  const net =
    f.values.selling_price *
    (1 - f.values.discount_percent / 100) *
    (1 + f.values.tax_percent / 100);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          required
          name="unit_cost"
          label="Unit cost"
          type="number"
          value={f.values.unit_cost}
          onChange={(e) => f.setFieldValue('unit_cost', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('unit_cost')}
          helperText={helper('unit_cost', 'Reference cost for internal accounting')}
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          required
          name="purchase_price"
          label="Purchase price"
          type="number"
          value={f.values.purchase_price}
          onChange={(e) => f.setFieldValue('purchase_price', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('purchase_price')}
          helperText={helper('purchase_price', 'What you pay the supplier')}
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          required
          name="selling_price"
          label="Selling price"
          type="number"
          value={f.values.selling_price}
          onChange={(e) => f.setFieldValue('selling_price', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('selling_price')}
          helperText={helper('selling_price', 'Listed price before tax / discount')}
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          required
          name="tax_percent"
          label="Tax / GST %"
          type="number"
          value={f.values.tax_percent}
          onChange={(e) => f.setFieldValue('tax_percent', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('tax_percent')}
          helperText={helper('tax_percent', '0, 5, 12, 18 or 28')}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          required
          name="discount_percent"
          label="Discount %"
          type="number"
          value={f.values.discount_percent}
          onChange={(e) => f.setFieldValue('discount_percent', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('discount_percent')}
          helperText={helper('discount_percent', '0 if no promotion')}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          name="weight_volume"
          label="Weight / Volume"
          value={f.values.weight_volume}
          onChange={f.handleChange}
          helperText='Free-form, e.g. "500 ml", "1 kg"'
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
