import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { Form, Formik } from 'formik';
import * as yup from 'yup';
import type { InventoryProductForm } from './queries';

interface Props {
  open: boolean;
  initialValues: InventoryProductForm;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: InventoryProductForm) => Promise<void> | void;
}

const schema: yup.ObjectSchema<InventoryProductForm> = yup.object({
  id: yup.string().optional(),
  product_name: yup.string().trim().min(2).max(120).required('Product name required'),
  sku: yup.string().trim().min(2).max(40).required('SKU required'),
  description: yup.string().max(500).default(''),
  image_url: yup.string().url('Enter a valid URL').default(''),
  unit_cost: yup.number().typeError('Cost required').min(0).max(1000000).required(),
  inventory_count: yup.number().typeError('Inventory required').integer().min(0).required(),
  is_active: yup.boolean().required(),
});

export default function InventoryProductDialog({
  open,
  initialValues,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = !!initialValues.id;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Formik<InventoryProductForm>
        initialValues={initialValues}
        enableReinitialize
        validationSchema={schema}
        onSubmit={onSubmit}
      >
        {({ values, errors, touched, handleChange, setFieldValue }) => (
          <Form noValidate>
            <DialogTitle>{isEdit ? 'Edit Inventory Product' : 'Add Inventory Product'}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <TextField
                  label="Product name"
                  name="product_name"
                  value={values.product_name}
                  onChange={handleChange}
                  error={!!touched.product_name && !!errors.product_name}
                  helperText={touched.product_name ? errors.product_name : undefined}
                  required
                />
                <TextField
                  label="SKU"
                  name="sku"
                  value={values.sku}
                  onChange={handleChange}
                  error={!!touched.sku && !!errors.sku}
                  helperText={touched.sku ? errors.sku : undefined}
                  required
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Unit cost"
                    name="unit_cost"
                    type="number"
                    value={values.unit_cost}
                    onChange={(event) => setFieldValue('unit_cost', Number(event.target.value) || 0)}
                    error={!!touched.unit_cost && !!errors.unit_cost}
                    helperText={touched.unit_cost ? errors.unit_cost : undefined}
                    fullWidth
                  />
                  <TextField
                    label="Inventory count"
                    name="inventory_count"
                    type="number"
                    value={values.inventory_count}
                    onChange={(event) => setFieldValue('inventory_count', Number(event.target.value) || 0)}
                    error={!!touched.inventory_count && !!errors.inventory_count}
                    helperText={touched.inventory_count ? errors.inventory_count : undefined}
                    fullWidth
                  />
                </Stack>
                <TextField label="Image URL" name="image_url" value={values.image_url} onChange={handleChange} />
                <TextField
                  label="Description"
                  name="description"
                  value={values.description}
                  onChange={handleChange}
                  multiline
                  minRows={3}
                />
                <FormControlLabel
                  control={<Switch checked={values.is_active} onChange={(_, checked) => setFieldValue('is_active', checked)} />}
                  label={values.is_active ? 'Active' : 'Inactive'}
                />
                {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}