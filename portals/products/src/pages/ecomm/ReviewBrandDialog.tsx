import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import BrandReviewDetails from './BrandReviewDetails';
import { BRAND_STATUS_COLOR } from './brandStatus';
import { APPROVE_ECOMM_BRAND, REJECT_ECOMM_BRAND, type EcommBrandRow } from './queries';
import { approveBlockedReasons, confirmCopy, type Decision } from './reviewBrandRules';

interface Props {
  brand: EcommBrandRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Approve/reject a partner brand submission — the brand sibling of
 * ReviewListingDialog so both review inboxes behave identically. */
export default function ReviewBrandDialog({ brand, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approve, { loading: approving }] = useMutation<any>(APPROVE_ECOMM_BRAND);
  const [reject, { loading: rejecting }] = useMutation<any>(REJECT_ECOMM_BRAND);
  const loading = approving || rejecting;

  useEffect(() => {
    if (!brand) return;
    setNotes(brand.reviewer_notes ?? '');
    setTagsText((brand.tags ?? []).join(', '));
    setError(null);
  }, [brand]);

  const trimmedNotes = notes.trim();
  const confirm = confirmCopy(t)[pending ?? 'APPROVE'];
  // Neither mutation checks the current status server-side, so say so when the
  // brand is not the one thing this inbox exists for: a pending submission.
  const openStatus = brand?.status ?? null;
  const staleStatus = openStatus === 'SUBMITTED' ? null : openStatus;
  // The server refuses to approve on these; showing them here means the
  // reviewer never learns them from an error toast. Reject stays available.
  const blocked = useMemo(() => (brand ? approveBlockedReasons(brand, t) : []), [brand, t]);

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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography component="span" variant="h6" noWrap sx={{ fontWeight: 900, flex: 1, minWidth: 0 }}>
              {brand?.brand_name ?? ''}
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
            {blocked.length > 0 && (
              <Alert severity="warning" data-testid="review-brand-blocked">
                {t('products.brandReview.approveBlocked')}
                <Typography variant="body2" component="p" sx={{ mt: 1, fontWeight: 700 }}>
                  {t('products.brandReview.blockedReasons')}
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {blocked.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </Box>
              </Alert>
            )}
            {brand && <BrandReviewDetails brand={brand} />}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              size="small"
              label={t('products.review.reviewerNotes')}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              multiline
              minRows={2}
              helperText={t('products.review.reviewerNotesHint')}
            />
            <TextField
              size="small"
              label={t('products.review.tags')}
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              helperText={t('products.review.tagsHint')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={loading}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <Box sx={{ flex: 1 }} />
          <DuncitButton
            color="error"
            variant="outlined"
            disabled={loading || !trimmedNotes}
            onClick={() => setPending('REJECT')}
            data-testid="review-brand-reject"
          >
            {t('products.brandReview.reject')}
          </DuncitButton>
          <DuncitButton
            color="success"
            variant="contained"
            disabled={loading || blocked.length > 0}
            onClick={() => setPending('APPROVE')}
            data-testid="review-brand-approve"
          >
            {t('products.brandReview.approve')}
          </DuncitButton>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!pending}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.label}
        cancelLabel={t('products.review.back')}
        confirmColor={confirm.color}
        loading={loading}
        busyLabel={t('products.brandReview.working')}
        onClose={() => setPending(null)}
        onConfirm={submit}
      />
    </>
  );
}
