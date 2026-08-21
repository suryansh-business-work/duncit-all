import { Grid } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

export default function SupplierDetailsSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="vendor_name"
          label={t('products.supplier.vendorName')}
          hint="Who supplies this product?"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="supplier_contact"
          label={t('products.supplier.contact')}
          hint="Phone or email — used by ops to reorder"
        />
      </Grid>
    </Grid>
  );
}
