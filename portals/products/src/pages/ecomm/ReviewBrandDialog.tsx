import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { StatusChip } from '@duncit/ui';
import BrandReviewDetails from './BrandReviewDetails';
import { BRAND_STATUS_COLOR } from './brandStatus';
import { APPROVE_ECOMM_BRAND, REJECT_ECOMM_BRAND, type EcommBrandRow } from './queries';

type Decision = 'APPROVE' | 'REJECT';

interface Props {
  brand: EcommBrandRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Approving grants a role and reactivating a rejection is a partner action, so
 * both decisions confirm first (@duncit/dialogs, no window.confirm). */
const CONFIRM_COPY: Record<
  Decision,
  { title: string; message: string; label: string; color: 'success' | 'error' }
> = {
  APPROVE: {
    title: 'Approve this brand?',
    message:
      'The brand goes live in the marketplace and its owner is granted the E-commerce Manager role. That role is only removed from Access, not from here.',
    label: 'Yes, approve',
    color: 'success',
  },
  REJECT: {
    title: 'Reject this brand?',
    message: 'The partner sees your notes and can edit the brand and submit it again.',
    label: 'Yes, reject',
    color: 'error',
  },
};

/** Approve/reject a partner brand submission — the brand sibling of
 * ReviewListingDialog so both review inboxes behave identically. */
export default function ReviewBrandDialog({ brand, onClose, onDone }: Readonly<Props>) {
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approve, { loading: approving }] = useMutation(APPROVE_ECOMM_BRAND);
  const [reject, { loading: rejecting }] = useMutation(REJECT_ECOMM_BRAND);
  const loading = approving || rejecting;

  useEffect(() => {
    if (!brand) return;
    setNotes(brand.reviewer_notes ?? '');
    setTagsText((brand.tags ?? []).join(', '));
    setError(null);
  }, [brand]);

  const trimmedNotes = notes.trim();
  const confirmCopy = CONFIRM_COPY[pending ?? 'APPROVE'];
  // Neither mutation checks the current status server-side, so say so when the
  // brand is not the one thing this inbox exists for: a pending submission.
  const openStatus = brand?.status ?? null;
  const staleStatus = openStatus === 'SUBMITTED' ? null : openStatus;

  const submit = async () => {
    /* v8 ignore next -- the decision buttons only render while a brand is set */
    if (!brand) return;
    const decision = pending;
    setPending(null);
    setError(null);
    try {
      if (decision === 'REJECT') {
        await reject({ variables: { brand_doc_id: brand.id, notes: trimmedNotes } });
        onDone(`${brand.brand_name} rejected. The partner can edit and submit it again.`);
        return;
      }
      const tags = tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      await approve({
        variables: { brand_doc_id: brand.id, notes: trimmedNotes || null, tags },
      });
      onDone(`${brand.brand_name} approved. The owner now has the E-commerce Manager role.`);
    } catch (e: any) {
      /* v8 ignore next -- Apollo errors always carry a message; the fallback is defensive */
      setError(e.message || 'Unable to review this brand.');
    }
  };

  return (
    <>
      <Dialog open={!!brand} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }} noWrap>
              {brand?.brand_name || 'Brand'}
            </Typography>
            {brand && <StatusChip status={brand.status} colorMap={BRAND_STATUS_COLOR} />}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {staleStatus && (
              <Alert severity="info">
                This brand is {staleStatus}, not awaiting review. Reviewing it again overwrites the
                previous decision.
              </Alert>
            )}
            {brand && <BrandReviewDetails brand={brand} />}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              size="small"
              label="Reviewer notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              multiline
              minRows={2}
              helperText="Required to reject — the partner reads this."
            />
            <TextField
              size="small"
              label="Tags"
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              helperText="Comma separated. Saved on approval only."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            color="error"
            variant="outlined"
            disabled={loading || !trimmedNotes}
            onClick={() => setPending('REJECT')}
          >
            Reject
          </Button>
          <Button
            color="success"
            variant="contained"
            disabled={loading}
            onClick={() => setPending('APPROVE')}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!pending}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.label}
        cancelLabel="Back"
        confirmColor={confirmCopy.color}
        loading={loading}
        busyLabel="Working…"
        onClose={() => setPending(null)}
        onConfirm={submit}
      />
    </>
  );
}
