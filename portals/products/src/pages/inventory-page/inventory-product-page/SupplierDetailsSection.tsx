import { Grid, TextField } from '@mui/material';
import { useFormikContext } from 'formik';
import type { InventoryProductFormValues } from './types';

export default function SupplierDetailsSection() {
  const f = useFormikContext<InventoryProductFormValues>();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          name="vendor_name"
          label="Vendor / supplier name"
          value={f.values.vendor_name}
          onChange={f.handleChange}
          helperText="Who supplies this product?"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          name="supplier_contact"
          label="Supplier contact"
          value={f.values.supplier_contact}
          onChange={f.handleChange}
          helperText="Phone or email — used by ops to reorder"
        />
      </Grid>
    </Grid>
  );
}
