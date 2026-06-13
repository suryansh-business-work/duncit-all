import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

const PRODUCT_LISTING_REQUESTS = gql`
  query ProductListingRequests($status: ProductListingReviewStatus) {
    productListingRequests(status: $status) {
      id
      product_name
      image_url
      description
      inventory_count
      unit_cost
      commission_pct
      delivery_target
      listing_review_status
      listing_review_notes
      listing_submitted_by_name
      is_duncit_delivery_partner
      size_label
      height_cm
      weight_kg
      color
      created_at
    }
  }
`;

const REVIEW_PRODUCT_LISTING = gql`
  mutation ReviewProductListing(
    $product_doc_id: ID!
    $status: ProductListingReviewStatus!
    $notes: String
    $commission_pct: Float
  ) {
    reviewProductListing(
      product_doc_id: $product_doc_id
      status: $status
      notes: $notes
      commission_pct: $commission_pct
    ) {
      id
      listing_review_status
      listing_review_notes
      commission_pct
      status
      is_active
    }
  }
`;

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error',
};

export default function EcommRequestsPage() {
  const [status, setStatus] = useState('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [commission, setCommission] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const variables = { status: status === 'ALL' ? null : status };
  const { data, loading, error, refetch } = useQuery(PRODUCT_LISTING_REQUESTS, { variables, fetchPolicy: 'cache-and-network' });
  const [review, { loading: reviewing }] = useMutation(REVIEW_PRODUCT_LISTING);
  const requests = data?.productListingRequests ?? [];

  const submitReview = async (item: any, nextStatus: 'APPROVED' | 'DENIED') => {
    setMessage(null);
    try {
      const raw = commission[item.id];
      const commissionPct = raw === undefined || raw === '' ? undefined : Number(raw);
      await review({
        variables: { product_doc_id: item.id, status: nextStatus, notes: notes[item.id] || '', commission_pct: commissionPct },
      });
      setMessage(nextStatus === 'APPROVED' ? 'Product approved for pod selection.' : 'Product request denied.');
      await refetch(variables);
    } catch (reviewError: any) {
      setMessage(reviewError.message || 'Unable to review product request.');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={950}>Ecomm Requests</Typography>
          <Typography color="text.secondary">Review partner product listings before they become selectable in pods.</Typography>
        </Box>
        <ToggleButtonGroup exclusive size="small" value={status} onChange={(_, value) => value && setStatus(value)}>
          {['PENDING', 'APPROVED', 'DENIED', 'ALL'].map((item) => <ToggleButton key={item} value={item}>{item}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>

      {message && <Alert severity={message.includes('Unable') ? 'error' : 'success'}>{message}</Alert>}
      {error && <Alert severity="error">{error.message}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={24} /></Stack>
          ) : requests.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>No product requests found for this filter.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Inventory</TableCell>
                  <TableCell>Commission</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell width={280}>Review</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((item: any) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box component="img" src={item.image_url} alt={item.product_name} sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'cover', bgcolor: 'action.hover' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={900}>{item.product_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.listing_submitted_by_name || 'Partner'} · {item.size_label} · {item.color}</Typography>
                          <Typography variant="caption" display="block" color="text.secondary">{item.height_cm}cm · {item.weight_kg}kg · {item.delivery_target === 'HOST' ? 'Host delivery' : 'Venue delivery'}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{item.inventory_count} units<br />₹{item.unit_cost}</TableCell>
                    <TableCell>{item.commission_pct}%<br /><Typography variant="caption">{item.is_duncit_delivery_partner ? 'Delivery partner' : 'Not delivery partner'}</Typography></TableCell>
                    <TableCell><Chip size="small" label={item.listing_review_status} color={statusColors[item.listing_review_status] || 'default'} /></TableCell>
                    <TableCell>
                      <Stack spacing={1}>
                        <TextField size="small" label="Admin note" value={notes[item.id] ?? item.listing_review_notes ?? ''} onChange={(event) => setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))} multiline minRows={2} />
                        <TextField
                          size="small"
                          label="Commission %"
                          type="number"
                          value={commission[item.id] ?? String(item.commission_pct ?? '')}
                          onChange={(event) => setCommission((prev) => ({ ...prev, [item.id]: event.target.value }))}
                          inputProps={{ min: 5, max: 50, step: 1, 'aria-label': 'Product commission percentage' }}
                          helperText="5–50% Duncit cut. Blank keeps current."
                        />
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="contained" disabled={reviewing} onClick={() => submitReview(item, 'APPROVED')}>Approve</Button>
                          <Button size="small" color="error" variant="outlined" disabled={reviewing} onClick={() => submitReview(item, 'DENIED')}>Deny</Button>
                        </Stack>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}