import { Grid } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { InventoryProductFormValues } from './types';

export default function SupplierDetailsSection() {
  const { control } = useFormContext<InventoryProductFormValues>();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="vendor_name"
          label="Vendor / supplier name"
          hint="Who supplies this product?"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="supplier_contact"
          label="Supplier contact"
          hint="Phone or email — used by ops to reorder"
        />
      </Grid>
    </Grid>
  );
}
