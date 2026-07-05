import {
  Alert,
  Avatar,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

interface Props {
  products: any[];
  loading: boolean;
  error?: string;
}

export default function BrandProductsTable({ products, loading, error }: Readonly<Props>) {
  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading && products.length === 0) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }
  if (products.length === 0) {
    return <Alert severity="info">This brand has no approved products yet.</Alert>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell />
          <TableCell>Product</TableCell>
          <TableCell>SKU</TableCell>
          <TableCell align="right">Price</TableCell>
          <TableCell align="right">Available</TableCell>
          <TableCell align="right">Commission</TableCell>
          <TableCell>Dimensions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {products.map((product: any) => (
          <TableRow key={product.id} hover>
            <TableCell sx={{ width: 52 }}>
              <Avatar src={product.image_url || undefined} variant="rounded" sx={{ width: 34, height: 34 }}>
                {product.product_name?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
            </TableCell>
            <TableCell>
              <Typography variant="body2" fontWeight={600}>
                {product.product_name}
              </Typography>
            </TableCell>
            <TableCell>{product.sku}</TableCell>
            <TableCell align="right">{money.format(product.selling_price || product.unit_cost)}</TableCell>
            <TableCell align="right">{product.available_count ?? product.inventory_count}</TableCell>
            <TableCell align="right">{product.commission_pct}%</TableCell>
            <TableCell>
              <Chip
                size="small"
                variant="outlined"
                label={`${product.length_cm}×${product.breadth_cm}×${product.height_cm} cm · ${product.weight_kg}kg`}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
