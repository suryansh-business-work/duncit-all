import { Box, Grid, Stack } from '@mui/material';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import RhfNumberField from './RhfNumberField';
import { RhfTextField } from '@duncit/forms';
import StockColorChip from './StockColorChip';
import DateField from '../../../components/DateField';
import type { InventoryProductFormValues } from './types';

export default function InventoryManagementSection() {
  const { control } = useFormContext<InventoryProductFormValues>();
  const inventoryCount = useWatch({ control, name: 'inventory_count' });
  const lowStockAlert = useWatch({ control, name: 'low_stock_alert' });

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Box sx={{ flex: 1, color: 'text.secondary', fontSize: 13 }}>
            Live stock indicator updates as you adjust counts below.
          </Box>
          <StockColorChip inventory={inventoryCount} lowStockAlert={lowStockAlert} />
        </Stack>
      </Grid>
      <Grid item xs={6} sm={3}>
        <RhfNumberField
          control={control}
          name="inventory_count"
          label="Current stock"
          hint="Total units on hand"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <RhfNumberField
          control={control}
          name="reserved_count"
          label="Reserved"
          hint="Held for confirmed pods"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <RhfNumberField
          control={control}
          name="damaged_count"
          label="Damaged / wasted"
          hint="Counts that cannot be sold"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <RhfNumberField
          control={control}
          name="low_stock_alert"
          label="Low stock alert"
          hint="Triggers warning when reached"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <RhfNumberField
          control={control}
          name="min_order_qty"
          label="Min order qty"
          hint="Smallest order allowed"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <RhfNumberField
          control={control}
          name="max_order_qty"
          label="Max order qty"
          hint="Largest single order"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <RhfTextField
          control={control}
          name="batch_number"
          label="Batch number"
          hint="Optional, useful for consumables"
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <Controller
          control={control}
          name="manufacturing_date"
          render={({ field }) => (
            <DateField
              label="Manufacturing date"
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <Controller
          control={control}
          name="expiry_date"
          render={({ field }) => (
            <DateField
              label="Expiry date"
              value={field.value ?? ''}
              onChange={field.onChange}
              helperText="Leave empty if non-perishable"
            />
          )}
        />
      </Grid>
      <Grid item xs={12}>
        <RhfTextField
          control={control}
          multiline
          minRows={2}
          name="storage_instructions"
          label="Storage instructions"
          hint="How to store this product"
        />
      </Grid>
    </Grid>
  );
}
