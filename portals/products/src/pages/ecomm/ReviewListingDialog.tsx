import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { REVIEW_PRODUCT_LISTING, type ProductListingRow } from './requestsQueries';
import ListingReviewDetails from './ListingReviewDetails';

interface Props {
  row: ProductListingRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Approve/deny a partner product listing — the per-row inline form moved into
 * a dialog so rows fit the shared table's fixed height. */
export default function ReviewListingDialog({ row, onClose, onDone }: Readonly<Props>) {
  const [notes, setNotes] = useState('');
  const [commission, setCommission] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [review, { loading }] = useMutation(REVIEW_PRODUCT_LISTING);

  useEffect(() => {
    if (!row) return;
    setNotes(row.listing_review_notes ?? '');
    setCommission(String(row.commission_pct ?? ''));
    setError(null);
  }, [row]);

  const submit = async (status: 'APPROVED' | 'DENIED') => {
    /* v8 ignore next -- the Approve/Deny buttons only render while a row is set */
    if (!row) return;
    setError(null);
    try {
      const commissionPct = commission === '' ? undefined : Number(commission);
      await review({
        variables: {
          product_doc_id: row.id,
          status,
          notes: notes || '',
          commission_pct: commissionPct,
        },
      });
      onDone(
        status === 'APPROVED' ? 'Product approved for pod selection.' : 'Product request denied.',
      );
    } catch (e: any) {
      /* v8 ignore next -- Apollo errors always carry a message; the fallback is defensive */
      setError(e.message || 'Unable to review product request.');
    }
  };

  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Review “{row?.product_name}”</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {row && <ListingReviewDetails row={row} />}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            size="small"
            label="Admin note"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
          />
          <TextField
            size="small"
            label="Commission %"
            type="number"
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
            inputProps={{ min: 5, max: 50, step: 1, 'aria-label': 'Product commission percentage' }}
            helperText="5–50% Duncit cut. Blank keeps current."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button color="error" variant="outlined" disabled={loading} onClick={() => submit('DENIED')}>
          Deny
        </Button>
        <Button variant="contained" disabled={loading} onClick={() => submit('APPROVED')}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
