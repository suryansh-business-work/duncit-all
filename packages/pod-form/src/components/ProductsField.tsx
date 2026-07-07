import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { getProductRequestTotal } from '../build-input';
import type { PodFormValues } from '../types';

interface Props {
  products: any[];
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

/** Field-array editor for approved Duncit product requests attached to a pod. */
export default function ProductsField({ products }: Readonly<Props>) {
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'product_requests' });
  const requests = useWatch({ control, name: 'product_requests' });
  const productErrors = errors.product_requests as Array<{ product_id?: { message?: string }; quantity?: { message?: string } }> | undefined;
  const selectedIds = new Set(requests.map((item) => item.product_id).filter(Boolean));
  const total = getProductRequestTotal(requests, products);

  const updateRow = (index: number, key: 'product_id' | 'quantity', value: string | number) => {
    setValue(`product_requests.${index}.${key}`, value as never, { shouldValidate: true });
  };

  return (
    <Stack spacing={2}>
      {fields.map((row, index) => {
        const item = requests[index] ?? { product_id: '', quantity: 1 };
        const product = products.find((entry) => entry.id === item.product_id);
        const rowTotal = (product?.unit_cost ?? 0) * (Number(item.quantity) || 0);
        const productIdError = productErrors?.[index]?.product_id?.message;
        const quantityError = productErrors?.[index]?.quantity?.message;
        return (
          <Stack key={row.id} direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="flex-start">
            <TextField
              select
              label="Approved product"
              value={item.product_id}
              onChange={(event) => updateRow(index, 'product_id', event.target.value)}
              fullWidth
              error={!!productIdError}
              helperText={productIdError}
            >
              {products.map((entry) => (
                <MenuItem
                  key={entry.id}
                  value={entry.id}
                  disabled={(selectedIds.has(entry.id) && entry.id !== item.product_id) || entry.available_count <= 0}
                >
                  {entry.product_name} ({currency.format(entry.unit_cost)} / unit, {entry.available_count} available)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Qty"
              type="number"
              value={item.quantity}
              onChange={(event) => updateRow(index, 'quantity', Number(event.target.value))}
              sx={{ width: { xs: '100%', md: 120 } }}
              inputProps={{ min: 1, max: product?.available_count ?? undefined }}
              error={!!quantityError}
              helperText={quantityError}
            />
            <TextField
              label="Cost"
              value={currency.format(rowTotal)}
              sx={{ width: { xs: '100%', md: 170 } }}
              InputProps={{ readOnly: true }}
            />
            <IconButton aria-label="Remove product" onClick={() => remove(index)} color="error">
              <DeleteIcon />
            </IconButton>
          </Stack>
        );
      })}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Button startIcon={<AddIcon />} onClick={() => append({ product_id: '', quantity: 1 })} disabled={products.length === 0} variant="outlined">
          Add approved product
        </Button>
        <Typography variant="subtitle1">Total product price: {currency.format(total)}</Typography>
      </Stack>
    </Stack>
  );
}
