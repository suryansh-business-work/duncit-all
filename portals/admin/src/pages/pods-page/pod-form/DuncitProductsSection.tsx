import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useFormikContext } from 'formik';
import type { PodForm } from '../queries';

interface Props {
  products: any[];
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function getProductRequestTotal(requests: PodForm['product_requests'], products: any[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return requests.reduce((sum, item) => {
    const product = byId.get(item.product_id);
    return sum + (product?.unit_cost ?? 0) * (Number(item.quantity) || 0);
  }, 0);
}

export default function DuncitProductsSection({ products }: Readonly<Props>) {
  const { values, setFieldValue, errors, touched } = useFormikContext<PodForm>();
  const productErrors = errors.product_requests as any[] | undefined;
  const productTouched = touched.product_requests as any[] | undefined;
  const selectedIds = new Set(values.product_requests.map((item) => item.product_id).filter(Boolean));
  const total = getProductRequestTotal(values.product_requests, products);

  const updateRow = (index: number, field: 'product_id' | 'quantity', value: string | number) => {
    const next = values.product_requests.map((item, idx) => (
      idx === index ? { ...item, [field]: value } : item
    ));
    setFieldValue('product_requests', next);
  };

  const addRow = () => setFieldValue('product_requests', [
    ...values.product_requests,
    { product_id: '', quantity: 1 },
  ]);

  const removeRow = (index: number) => setFieldValue(
    'product_requests',
    values.product_requests.filter((_, idx) => idx !== index)
  );

  return (
    <Stack spacing={2}>
      {values.product_requests.map((item, index) => {
        const product = products.find((entry) => entry.id === item.product_id);
        const rowTotal = (product?.unit_cost ?? 0) * (Number(item.quantity) || 0);
        return (
          <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="flex-start">
            <TextField
              select
              label="Approved product"
              value={item.product_id}
              onChange={(event) => updateRow(index, 'product_id', event.target.value)}
              fullWidth
              error={!!productTouched?.[index]?.product_id && !!productErrors?.[index]?.product_id}
              helperText={productTouched?.[index]?.product_id ? productErrors?.[index]?.product_id : undefined}
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
              error={!!productTouched?.[index]?.quantity && !!productErrors?.[index]?.quantity}
              helperText={productTouched?.[index]?.quantity ? productErrors?.[index]?.quantity : undefined}
            />
            <TextField
              label="Cost"
              value={currency.format(rowTotal)}
              sx={{ width: { xs: '100%', md: 170 } }}
              InputProps={{ readOnly: true }}
            />
            <IconButton aria-label="Remove product" onClick={() => removeRow(index)} color="error">
              <DeleteIcon />
            </IconButton>
          </Stack>
        );
      })}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Button startIcon={<AddIcon />} onClick={addRow} disabled={products.length === 0} variant="outlined">
          Add approved product
        </Button>
        <Typography variant="subtitle1">Total product price: {currency.format(total)}</Typography>
      </Stack>
    </Stack>
  );
}