import {
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import InventoryIcon from '@mui/icons-material/Inventory2';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import PercentSlider from './PercentSlider';
import { newProduct, type ProductRow } from './types';

interface Props {
  products: ProductRow[];
  onChange: (products: ProductRow[]) => void;
}

export default function ProductsCard({ products, onChange }: Props) {
  const updateOne = (id: string, patch: Partial<ProductRow>) => {
    onChange(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };
  const remove = (id: string) => onChange(products.filter((p) => p.id !== id));
  const add = () => onChange([...products, newProduct()]);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <InventoryIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>
            Product add-ons
          </Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={add}>
            Add product
          </Button>
        </Stack>
        {products.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No products added. Each product contributes its price × commission to Duncit profit.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {products.map((product, index) => (
              <Card key={product.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                    Product {index + 1}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => remove(product.id)} aria-label="remove product">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Name"
                    size="small"
                    value={product.name}
                    onChange={(e) => updateOne(product.id, { name: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Price"
                    size="small"
                    type="number"
                    value={product.price}
                    onChange={(e) => updateOne(product.id, { price: Math.max(0, Number(e.target.value)) })}
                    inputProps={{ min: 0, step: 10 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
                    sx={{ width: { sm: 160 } }}
                  />
                </Stack>
                <PercentSlider
                  label="Commission to Duncit"
                  value={product.commission_percent}
                  onChange={(value) => updateOne(product.id, { commission_percent: value })}
                  max={100}
                  hint="Percent of this product's price that Duncit keeps."
                />
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
