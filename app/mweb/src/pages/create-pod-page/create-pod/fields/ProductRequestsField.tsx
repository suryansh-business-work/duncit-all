import { Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CreatePodProduct, PodProductRequest } from '../create-pod.types';

interface Props {
  value: PodProductRequest[];
  onChange: (next: PodProductRequest[]) => void;
  products: CreatePodProduct[];
  error?: string;
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function productRequestTotal(requests: PodProductRequest[], products: CreatePodProduct[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return requests.reduce(
    (sum, item) => sum + (byId.get(item.product_id)?.unit_cost ?? 0) * (Number(item.quantity) || 0),
    0
  );
}

/** Editable list of Duncit product requests (product + quantity) for a pod. */
export default function ProductRequestsField({ value, onChange, products, error }: Readonly<Props>) {
  const selectedIds = new Set(value.map((item) => item.product_id).filter(Boolean));
  const update = (idx: number, patch: Partial<PodProductRequest>) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const add = () => onChange([...value, { product_id: '', quantity: 1 }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <Stack spacing={2}>
      {value.map((item, idx) => {
        const product = products.find((entry) => entry.id === item.product_id);
        const rowTotal = (product?.unit_cost ?? 0) * (Number(item.quantity) || 0);
        return (
          <Stack key={idx} direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="flex-start">
            <TextField
              select
              label="Approved product"
              value={item.product_id}
              onChange={(e) => update(idx, { product_id: e.target.value })}
              fullWidth
            >
              {products.map((entry) => (
                <MenuItem
                  key={entry.id}
                  value={entry.id}
                  disabled={(selectedIds.has(entry.id) && entry.id !== item.product_id) || entry.available_count <= 0}
                >
                  {entry.product_name} ({currency.format(entry.unit_cost)} / unit, {entry.available_count} left)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Qty"
              type="number"
              value={item.quantity}
              onChange={(e) => update(idx, { quantity: Number(e.target.value) || 0 })}
              sx={{ width: { xs: '100%', md: 110 } }}
              inputProps={{ min: 1, max: product?.available_count ?? undefined }}
            />
            <TextField
              label="Cost"
              value={currency.format(rowTotal)}
              sx={{ width: { xs: '100%', md: 150 } }}
              InputProps={{ readOnly: true }}
            />
            <IconButton aria-label="Remove product" onClick={() => remove(idx)} color="error">
              <DeleteIcon />
            </IconButton>
          </Stack>
        );
      })}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Button startIcon={<AddIcon />} onClick={add} disabled={products.length === 0} variant="outlined">
          Add product
        </Button>
        <Typography variant="subtitle2">
          Total: {currency.format(productRequestTotal(value, products))}
        </Typography>
      </Stack>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
