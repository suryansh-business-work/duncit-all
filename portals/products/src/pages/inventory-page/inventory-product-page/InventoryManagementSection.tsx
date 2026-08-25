import { Box, Grid, Stack } from '@mui/material';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import RhfNumberField from './RhfNumberField';
import { RhfTextField } from '@duncit/forms';
import StockColorChip from './StockColorChip';
import DateField from '../../../components/DateField';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

export default function InventoryManagementSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  const inventoryCount = useWatch({ control, name: 'inventory_count' });
  const lowStockAlert = useWatch({ control, name: 'low_stock_alert' });

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
          alignItems: { sm: 'center' }
        }}>
          <Box sx={{ flex: 1, color: 'text.secondary', fontSize: 13 }}>
            Live stock indicator updates as you adjust counts below.
          </Box>
          <StockColorChip inventory={inventoryCount} lowStockAlert={lowStockAlert} />
        </Stack>
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <RhfNumberField
          control={control}
          name="inventory_count"
          label={t('products.stock.currentStock')}
          hint="Total units on hand"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <RhfNumberField
          control={control}
          name="reserved_count"
          label={t('products.stock.reserved')}
          hint="Held for confirmed pods"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <RhfNumberField
          control={control}
          name="damaged_count"
          label={t('products.stock.damaged')}
          hint="Counts that cannot be sold"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <RhfNumberField
          control={control}
          name="low_stock_alert"
          label={t('products.stock.lowStockAlert')}
          hint="Triggers warning when reached"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <RhfNumberField
          control={control}
          name="min_order_qty"
          label={t('products.stock.minOrderQty')}
          hint="Smallest order allowed"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <RhfNumberField
          control={control}
          name="max_order_qty"
          label={t('products.stock.maxOrderQty')}
          hint="Largest single order"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <RhfTextField
          control={control}
          name="batch_number"
          label={t('products.stock.batchNumber')}
          hint="Optional, useful for consumables"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <Controller
          control={control}
          name="manufacturing_date"
          render={({ field }) => (
            <DateField
              label={t('products.stock.manufacturingDate')}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 3
        }}>
        <Controller
          control={control}
          name="expiry_date"
          render={({ field }) => (
            <DateField
              label={t('products.stock.expiryDate')}
              value={field.value ?? ''}
              onChange={field.onChange}
              helperText={t('products.stock.expiryHint')}
            />
          )}
        />
      </Grid>
      <Grid size={12}>
        <RhfTextField
          control={control}
          multiline
          minRows={2}
          name="storage_instructions"
          label={t('products.stock.storageInstructions')}
          hint="How to store this product"
        />
      </Grid>
    </Grid>
  );
}
