import { gql, useMutation, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { parseApiError } from '../../utils/parseApiError';
import ProductListingsToolbar from './ProductListingsToolbar';

const PRODUCT_FIELDS = `
  id
  product_name
  description
  image_url
  images
  size_label
  height_cm
  weight_kg
  color
  inventory_count
  available_count
  unit_cost
  commission_pct
  delivery_target
  listing_review_status
  listing_review_notes
  is_duncit_delivery_partner
  updated_at
`;

export const MY_PRODUCT_LISTINGS = gql`
  query MyProductListings { myProductListings { ${PRODUCT_FIELDS} } }
`;

const UPDATE_QUANTITY = gql`
  mutation UpdateMyProductListingQuantity($product_doc_id: ID!, $inventory_count: Int!) {
    updateMyProductListingQuantity(product_doc_id: $product_doc_id, inventory_count: $inventory_count) { ${PRODUCT_FIELDS} }
  }
`;

const DELETE_LISTING = gql`
  mutation DeleteMyProductListing($product_doc_id: ID!) {
    deleteMyProductListing(product_doc_id: $product_doc_id)
  }
`;

interface Props {
  refreshKey?: number;
  canManageProducts?: boolean;
  onEdit: (product: any) => void;
}

export default function ProductListingsTable({ refreshKey = 0, canManageProducts = false, onEdit }: Readonly<Props>) {
  const { data, loading, error, refetch } = useQuery(MY_PRODUCT_LISTINGS, { fetchPolicy: 'cache-and-network' });
  const [updateQuantity, quantityState] = useMutation(UPDATE_QUANTITY);
  const [deleteListing, deleteState] = useMutation(DELETE_LISTING);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [target, setTarget] = useState('ALL');
  const [sort, setSort] = useState('updated_desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const products = data?.myProductListings ?? [];
  const statusOptions = Array.from(new Set(products.map((product: any) => product.listing_review_status).filter(Boolean))).sort() as string[];
  const filteredProducts = sortProducts(products.filter((product: any) => matchesProduct(product, search, status, target)), sort);
  const visibleProducts = filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => { refetch(); }, [refreshKey, refetch]);
  useEffect(() => { setPage(0); }, [search, status, target, sort, products.length]);
  useEffect(() => {
    setQuantities(Object.fromEntries(products.map((item: any) => [item.id, String(item.inventory_count ?? 0)])));
  }, [products]);

  const saveQuantity = async (product: any) => {
    setMessage(null);
    try {
      await updateQuantity({ variables: { product_doc_id: product.id, inventory_count: Number(quantities[product.id] || 0) } });
      setMessage('Quantity updated.');
      await refetch();
    } catch (updateError) {
      setMessage(parseApiError(updateError));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setMessage(null);
    try {
      await deleteListing({ variables: { product_doc_id: deleteTarget.id } });
      setDeleteTarget(null);
      setMessage('Product listing deleted.');
      await refetch();
    } catch (deleteError) {
      setMessage(parseApiError(deleteError));
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 0 }}>
        <Stack spacing={1.5} sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" fontWeight={950}>Your listed products</Typography>
          <ProductListingsToolbar search={search} status={status} target={target} sort={sort} statusOptions={statusOptions} onSearch={setSearch} onStatus={setStatus} onTarget={setTarget} onSort={setSort} />
          {message && <Alert severity={message.includes('deleted') || message.includes('updated') ? 'success' : 'error'}>{message}</Alert>}
          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
        {loading && !data ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack> : products.length === 0 ? <Alert severity="info" sx={{ m: 2 }}>No product listings yet.</Alert> : filteredProducts.length === 0 ? <Alert severity="info" sx={{ m: 2 }}>No product listings match your filters.</Alert> : (
          <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Product</TableCell><TableCell>Price</TableCell><TableCell>Quantity</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {visibleProducts.map((product: any) => {
                const image = product.image_url || product.images?.[0];
                return (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box component="img" src={image} alt={product.product_name} sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover', bgcolor: 'action.hover' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={900} noWrap>{product.product_name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{product.images?.length || 0} images · {product.size_label || 'No size'}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>₹{Number(product.unit_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField size="small" type="number" value={quantities[product.id] ?? ''} disabled={!canManageProducts} onChange={(event) => setQuantities((prev) => ({ ...prev, [product.id]: event.target.value }))} inputProps={{ min: 0 }} sx={{ width: 92 }} />
                        <Button size="small" disabled={!canManageProducts || quantityState.loading} onClick={() => saveQuantity(product)}>Update</Button>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" label={product.listing_review_status} color={product.listing_review_status === 'APPROVED' ? 'success' : product.listing_review_status === 'DENIED' ? 'error' : 'warning'} /></TableCell>
                    <TableCell align="right"><Button size="small" disabled={!canManageProducts} onClick={() => onEdit(product)}>Edit</Button><Button size="small" color="error" disabled={!canManageProducts} onClick={() => setDeleteTarget(product)}>Delete</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination component="div" count={filteredProducts.length} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[5, 10, 25]} onPageChange={(_event, nextPage) => setPage(nextPage)} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} />
          </TableContainer>
        )}
      </CardContent>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete product listing</DialogTitle>
        <DialogContent><Typography>{deleteTarget?.product_name} will be archived and removed from active listing.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" variant="contained" disabled={deleteState.loading} onClick={confirmDelete}>Delete</Button></DialogActions>
      </Dialog>
    </Card>
  );
}

function matchesProduct(product: any, search: string, status: string, target: string) {
  const query = search.trim().toLowerCase();
  const haystack = [product.product_name, product.description, product.size_label, product.color].filter(Boolean).join(' ').toLowerCase();
  return (!query || haystack.includes(query)) && (status === 'ALL' || product.listing_review_status === status) && (target === 'ALL' || product.delivery_target === target);
}

function sortProducts(products: any[], sort: string) {
  const next = [...products];
  if (sort === 'name_asc') return next.sort((a, b) => String(a.product_name || '').localeCompare(String(b.product_name || '')));
  if (sort === 'price_desc') return next.sort((a, b) => Number(b.unit_cost || 0) - Number(a.unit_cost || 0));
  if (sort === 'quantity_asc') return next.sort((a, b) => Number(a.inventory_count || 0) - Number(b.inventory_count || 0));
  return next.sort((a, b) => Date.parse(b.updated_at || '') - Date.parse(a.updated_at || ''));
}