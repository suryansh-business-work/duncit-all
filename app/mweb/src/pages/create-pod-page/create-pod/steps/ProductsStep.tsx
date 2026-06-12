import { Controller } from 'react-hook-form';
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material';
import ProductRequestsField from '../fields/ProductRequestsField';
import type { CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
}

/** Step 6 — optionally attach Duncit products to the pod. */
export default function ProductsStep({ form, products }: Readonly<Props>) {
  const enabled = form.watch('products_enabled');

  return (
    <Stack spacing={2}>
      <Controller
        control={form.control}
        name="products_enabled"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(e) => {
                  field.onChange(e.target.checked);
                  if (!e.target.checked) form.setValue('product_requests', []);
                }}
              />
            }
            label="Attach products to this pod"
          />
        )}
      />
      {enabled && products.length === 0 && (
        <Alert severity="info">No approved products are available to attach right now.</Alert>
      )}
      {enabled && (
        <Controller
          control={form.control}
          name="product_requests"
          render={({ field, fieldState }) => (
            <ProductRequestsField
              value={field.value}
              onChange={field.onChange}
              products={products}
              error={fieldState.error?.message}
            />
          )}
        />
      )}
    </Stack>
  );
}
