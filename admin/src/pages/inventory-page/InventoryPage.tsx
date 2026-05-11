import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import InventoryProductDialog from './InventoryProductDialog';
import {
  CREATE_PRODUCT,
  DELETE_PRODUCT,
  INVENTORY_PRODUCTS,
  UPDATE_PRODUCT,
  blankInventoryForm,
  type InventoryProductForm,
} from './queries';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<InventoryProductForm>(blankInventoryForm);
  const [opError, setOpError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, refetch } = useQuery(INVENTORY_PRODUCTS, {
    variables: { search: search || undefined },
    fetchPolicy: 'cache-and-network',
  });
  const [createProduct] = useMutation(CREATE_PRODUCT);
  const [updateProduct] = useMutation(UPDATE_PRODUCT);
  const [deleteProduct] = useMutation(DELETE_PRODUCT);
  const products = data?.inventoryProducts ?? [];

  const openCreate = () => {
    setInitialValues(blankInventoryForm);
    setOpError(null);
    setOpen(true);
  };

  const openEdit = (product: any) => {
    setInitialValues({
      id: product.id,
      product_name: product.product_name,
      sku: product.sku,
      description: product.description ?? '',
      image_url: product.image_url ?? '',
      unit_cost: product.unit_cost ?? 0,
      inventory_count: product.inventory_count ?? 0,
      is_active: !!product.is_active,
    });
    setOpError(null);
    setOpen(true);
  };

  const submit = async (values: InventoryProductForm) => {
    setBusy(true);
    setOpError(null);
    const { id, ...input } = values;
    try {
      if (id) await updateProduct({ variables: { id, input } });
      else await createProduct({ variables: { input } });
      setOpen(false);
      await refetch();
    } catch (err: any) {
      setOpError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (product: any) => {
    if (!confirm(`Deactivate product "${product.product_name}"?`)) return;
    await deleteProduct({ variables: { id: product.id } });
    await refetch();
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700}>Inventory</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage Duncit products, available units, and requested counts.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Product</Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && products.length === 0 ? <CircularProgress /> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Unit Cost</TableCell>
              <TableCell>Inventory</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>Available</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id} hover>
                <TableCell>{product.product_name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{money.format(product.unit_cost)}</TableCell>
                <TableCell>{product.inventory_count}</TableCell>
                <TableCell>{product.requested_count}</TableCell>
                <TableCell>{product.available_count}</TableCell>
                <TableCell><Chip size="small" label={product.is_active ? 'Active' : 'Inactive'} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(product)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Deactivate"><IconButton size="small" onClick={() => remove(product)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <InventoryProductDialog open={open} initialValues={initialValues} busy={busy} error={opError} onClose={() => setOpen(false)} onSubmit={submit} />
    </Stack>
  );
}