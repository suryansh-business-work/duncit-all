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
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { parseApiError } from '../../utils/parseApiError';

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

const MY_PRODUCT_LISTINGS = gql`
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
  refreshKey: number;
  onEdit: (product: any) => void;
}

export default function ProductListingsTable({ refreshKey, onEdit }: Props) {
  const { data, loading, error, refetch } = useQuery(MY_PRODUCT_LISTINGS, { fetchPolicy: 'cache-and-network' });
  const [updateQuantity, quantityState] = useMutation(UPDATE_QUANTITY);
  const [deleteListing, deleteState] = useMutation(DELETE_LISTING);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const products = data?.myProductListings ?? [];

  useEffect(() => { refetch(); }, [refreshKey, refetch]);
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
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      <CardContent sx={{ p: 0 }}>
        <Stack spacing={1.5} sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" fontWeight={950}>Your listed products</Typography>
          {message && <Alert severity={message.includes('deleted') || message.includes('updated') ? 'success' : 'error'}>{message}</Alert>}
          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
        {loading && !data ? <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack> : products.length === 0 ? <Alert severity="info" sx={{ m: 2 }}>No product listings yet.</Alert> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Product</TableCell><TableCell>Price</TableCell><TableCell>Quantity</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {products.map((product: any) => {
                const image = product.image_url || product.images?.[0];
                return (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box component="img" src={image} alt={product.product_name} sx={{ width: 56, height: 56, borderRadius: 2, objectFit: 'cover', bgcolor: 'action.hover' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={900} noWrap>{product.product_name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{product.images?.length || 0} images · {product.size_label || 'No size'}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>₹{Number(product.unit_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField size="small" type="number" value={quantities[product.id] ?? ''} onChange={(event) => setQuantities((prev) => ({ ...prev, [product.id]: event.target.value }))} inputProps={{ min: 0 }} sx={{ width: 92 }} />
                        <Button size="small" disabled={quantityState.loading} onClick={() => saveQuantity(product)}>Update</Button>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" label={product.listing_review_status} color={product.listing_review_status === 'APPROVED' ? 'success' : product.listing_review_status === 'DENIED' ? 'error' : 'warning'} /></TableCell>
                    <TableCell align="right"><Button size="small" onClick={() => onEdit(product)}>Edit</Button><Button size="small" color="error" onClick={() => setDeleteTarget(product)}>Delete</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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