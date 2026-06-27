import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { PartnerPodFormValues } from './partner-pod.types';

interface Props {
  products: any[];
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function PartnerPodProductsField({ products }: Readonly<Props>) {
  const { control, watch, setValue, formState: { errors } } = useFormContext<PartnerPodFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'product_requests' });
  const rows = watch('product_requests');
  const productErrors = errors.product_requests as Array<{ product_id?: { message?: string }; quantity?: { message?: string } }> | undefined;
  const selectedIds = new Set(rows.map((item) => item.product_id).filter(Boolean));
  const total = rows.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.product_id);
    return sum + (product?.unit_cost ?? 0) * (Number(item.quantity) || 0);
  }, 0);
  const updateRow = (index: number, key: 'product_id' | 'quantity', value: string | number) => {
    setValue(`product_requests.${index}.${key}`, value as never, { shouldValidate: true });
  };

  return (
    <Stack spacing={2}>
      {fields.map((row, index) => {
        const item = rows[index] ?? { product_id: '', quantity: 1 };
        const product = products.find((entry) => entry.id === item.product_id);
        const rowTotal = (product?.unit_cost ?? 0) * (Number(item.quantity) || 0);
        const productIdError = productErrors?.[index]?.product_id?.message;
        const quantityError = productErrors?.[index]?.quantity?.message;
        return (
          <Stack key={row.id} direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems="flex-start">
            <TextField select label="Approved product" value={item.product_id} onChange={(event) => updateRow(index, 'product_id', event.target.value)} fullWidth error={!!productIdError} helperText={productIdError}>
              {products.map((entry) => <MenuItem key={entry.id} value={entry.id} disabled={(selectedIds.has(entry.id) && entry.id !== item.product_id) || entry.available_count <= 0}>{entry.product_name} ({currency.format(entry.unit_cost)} / unit, {entry.available_count} available)</MenuItem>)}
            </TextField>
            <TextField label="Qty" type="number" value={item.quantity} onChange={(event) => updateRow(index, 'quantity', Number(event.target.value))} sx={{ width: { xs: '100%', md: 120 } }} inputProps={{ min: 1, max: product?.available_count ?? undefined }} error={!!quantityError} helperText={quantityError} />
            <TextField label="Cost" value={currency.format(rowTotal)} sx={{ width: { xs: '100%', md: 160 } }} InputProps={{ readOnly: true }} />
            <IconButton aria-label="Remove product" color="error" onClick={() => remove(index)}><DeleteIcon /></IconButton>
          </Stack>
        );
      })}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Button startIcon={<AddIcon />} variant="outlined" disabled={products.length === 0} onClick={() => append({ product_id: '', quantity: 1 })}>Add approved product</Button>
        <Typography variant="subtitle2" fontWeight={900}>Product total: {currency.format(total)}</Typography>
      </Stack>
    </Stack>
  );
}
