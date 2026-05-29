import { Box, Grid, Stack, TextField } from '@mui/material';
import { useFormikContext } from 'formik';
import StockColorChip from './StockColorChip';
import DateField from '../../../components/DateField';
import type { InventoryProductFormValues } from './types';

const num = (v: any) => (v === '' ? 0 : Number(v));

export default function InventoryManagementSection() {
  const f = useFormikContext<InventoryProductFormValues>();
  const showError = (k: keyof InventoryProductFormValues) =>
    !!(f.touched[k] && f.errors[k]);
  const helper = (k: keyof InventoryProductFormValues, fb: string) =>
    (f.touched[k] && (f.errors[k] as string)) || fb;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Box sx={{ flex: 1, color: 'text.secondary', fontSize: 13 }}>
            Live stock indicator updates as you adjust counts below.
          </Box>
          <StockColorChip
            inventory={f.values.inventory_count}
            lowStockAlert={f.values.low_stock_alert}
          />
        </Stack>
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          name="inventory_count"
          label="Current stock"
          type="number"
          value={f.values.inventory_count}
          onChange={(e) => f.setFieldValue('inventory_count', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('inventory_count')}
          helperText={helper('inventory_count', 'Total units on hand')}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          name="reserved_count"
          label="Reserved"
          type="number"
          value={f.values.reserved_count}
          onChange={(e) => f.setFieldValue('reserved_count', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('reserved_count')}
          helperText={helper('reserved_count', 'Held for confirmed pods')}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          name="damaged_count"
          label="Damaged / wasted"
          type="number"
          value={f.values.damaged_count}
          onChange={(e) => f.setFieldValue('damaged_count', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('damaged_count')}
          helperText={helper('damaged_count', 'Counts that cannot be sold')}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          name="low_stock_alert"
          label="Low stock alert"
          type="number"
          value={f.values.low_stock_alert}
          onChange={(e) => f.setFieldValue('low_stock_alert', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('low_stock_alert')}
          helperText={helper('low_stock_alert', 'Triggers warning when reached')}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          name="min_order_qty"
          label="Min order qty"
          type="number"
          value={f.values.min_order_qty}
          onChange={(e) => f.setFieldValue('min_order_qty', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('min_order_qty')}
          helperText={helper('min_order_qty', 'Smallest order allowed')}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          name="max_order_qty"
          label="Max order qty"
          type="number"
          value={f.values.max_order_qty}
          onChange={(e) => f.setFieldValue('max_order_qty', num(e.target.value))}
          onBlur={f.handleBlur}
          error={showError('max_order_qty')}
          helperText={helper('max_order_qty', 'Largest single order')}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          name="batch_number"
          label="Batch number"
          value={f.values.batch_number}
          onChange={f.handleChange}
          helperText="Optional, useful for consumables"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <DateField
          label="Manufacturing date"
          value={f.values.manufacturing_date}
          onChange={(iso) => f.setFieldValue('manufacturing_date', iso)}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <DateField
          label="Expiry date"
          value={f.values.expiry_date}
          onChange={(iso) => f.setFieldValue('expiry_date', iso)}
          helperText="Leave empty if non-perishable"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          name="storage_instructions"
          label="Storage instructions"
          value={f.values.storage_instructions}
          onChange={f.handleChange}
          helperText="How to store this product"
        />
      </Grid>
    </Grid>
  );
}
