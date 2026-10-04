import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { StatusChip } from '@duncit/ui';
import { logs } from '@duncit/logs';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import DeletionImpactView from './DeletionImpactView';
import { DELETION_STATUS_COLORS } from './deletionColumns';
import { CATALOG_DELETION_DETAIL, REVIEW_CATALOG_DELETION, type DeletionDetail } from './queries';

interface Props {
  requestId: string | null;
  onClose: () => void;
  onReviewed: () => void;
}

/** One deletion request: what it is, what it touches right now, its history — and the approve/reject decision. */
export default function DeletionReviewDialog({ requestId, onClose, onReviewed }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate, formatDateTime } = useDateFormat();
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ catalogDeletionRequest: DeletionDetail }>(CATALOG_DELETION_DETAIL, {
    variables: { id: requestId },
    skip: !requestId,
    fetchPolicy: 'network-only',
  });
  const [review, reviewState] = useMutation(REVIEW_CATALOG_DELETION);
  const detail = data?.catalogDeletionRequest;
  const req = detail?.request;
  const reviewable = req?.status === 'PENDING' && !req.parent_id;

  const close = () => {
    setNote('');
    setNoteMissing(false);
    onClose();
  };

  const decide = async (approve: boolean) => {
    if (!approve && !note.trim()) {
      setNoteMissing(true);
      return;
    }
    try {
      await review({ variables: { id: requestId, approve, note: note.trim() || null } });
      notifySuccess(t(approve ? 'products.deletionRequests.approved' : 'products.deletionRequests.rejected'));
      onReviewed();
      await refetch();
    } catch (reviewError) {
      logs.portal.products.error('DeletionReviewDialog', 'review', { error: reviewError });
      notifyError(reviewError instanceof Error ? reviewError.message : t('products.orders.actionFailed'));
    }
  };

  const fact = (label: string, value: string) => (
    <Typography variant="body2">
      <strong>{label}:</strong> {value || '—'}
    </Typography>
  );

  let body;
  if (loading && !detail) {
    body = <CircularProgress aria-label={t('products.deletionRequests.loading')} />;
  } else if (error || !req || !detail) {
    body = <Alert severity="error">{t('products.deletionRequests.loadFailed')}</Alert>;
  } else {
    body = (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <StatusChip status={req.status} label={t(`products.deletionRequests.status.${req.status}`)} colorMap={DELETION_STATUS_COLORS} />
          {req.blocked_reason && <Typography variant="body2" sx={{ color: 'warning.main' }}>{req.blocked_reason}</Typography>}
        </Stack>
        {fact(t('products.deletionRequests.colBrand'), req.brand_name)}
        {req.kind === 'PRODUCT' && fact(t('products.deletionRequests.colProduct'), req.product_name)}
        {fact(t('products.deletionRequests.colMode'), t(`products.deletionRequests.mode.${req.mode}`))}
        {fact(t('products.deletionRequests.colScheduled'), formatDate(req.scheduled_for))}
        {fact(t('products.deletionRequests.reason'), req.reason)}
        {fact(t('products.deletionRequests.colRequestedBy'), req.requested_by_name)}
        {req.cancelled_orders > 0 &&
          fact(t('products.deletionRequests.cancelledOrders'), t('products.deletionRequests.cancelledLine', {
            vars: { cancelled: req.cancelled_orders, failed: req.failed_refunds },
          }))}
        {req.review_note && fact(t('products.deletionRequests.reviewNote'), req.review_note)}
        {req.parent_id && <Alert severity="info">{t('products.deletionRequests.childHint')}</Alert>}
        <Divider />
        <DeletionImpactView impact={detail.impact} />
        <Divider />
        <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('products.deletionRequests.history')}
        </Typography>
        {req.events.map((e) => (
          <Typography key={`${e.at}-${e.action}`} variant="body2">
            {formatDateTime(e.at)} · {e.action} · {e.by}
            {e.note ? ` — ${e.note}` : ''}
          </Typography>
        ))}
        {reviewable && req.mode === 'CANCEL_AND_REFUND' && (
          <Alert severity="warning">{t('products.deletionRequests.approveCancelWarning')}</Alert>
        )}
        {reviewable && (
          <TextField
            label={t('products.deletionRequests.reviewNote')}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteMissing(false);
            }}
            multiline
            minRows={2}
            error={noteMissing}
            helperText={noteMissing ? t('products.deletionRequests.rejectNeedsNote') : t('products.deletionRequests.noteHint')}
            data-testid="deletion-review-note"
          />
        )}
      </Stack>
    );
  }

  return (
    <Dialog open={!!requestId} onClose={close} fullWidth maxWidth="md" aria-labelledby="deletion-review-title">
      <DialogTitle id="deletion-review-title">
        {t('products.deletionRequests.reviewTitle', { vars: { no: req?.request_no ?? '' } })}
      </DialogTitle>
      <DialogContent dividers>{body}</DialogContent>
      <DialogActions>
        <DuncitButton onClick={close}>{t('shell.common.close')}</DuncitButton>
        {reviewable && (
          <>
            <DuncitButton color="error" variant="outlined" loading={reviewState.loading} onClick={() => decide(false)} data-testid="deletion-reject">
              {t('products.deletionRequests.reject')}
            </DuncitButton>
            <DuncitButton variant="contained" loading={reviewState.loading} onClick={() => decide(true)} data-testid="deletion-approve">
              {t('products.deletionRequests.approve')}
            </DuncitButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
