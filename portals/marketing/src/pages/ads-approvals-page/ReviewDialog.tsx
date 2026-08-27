import { useEffect, useState } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import ReviewDetails from './ReviewDetails';
import type { AdRequestRow } from './helpers';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  request: AdRequestRow | null;
  saving: boolean;
  error: string | null;
  formatDateTime: (s: string) => string;
  onClose: () => void;
  onReview: (id: string, approve: boolean, remarks: string) => Promise<void> | void;
}

export default function ReviewDialog({
  request,
  saving,
  error,
  formatDateTime,
  onClose,
  onReview,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    setRemarks('');
  }, [request?.id]);

  if (!request) return null;

  // Only PENDING can be reviewed; reviewed rows open read-only.
  const isPending = request.status === 'PENDING';

  const review = (approve: boolean) => {
    // onReview may be sync or async — normalise so a rejection is reported, not dropped.
    Promise.resolve(onReview(request.id, approve, remarks.trim())).catch((error) =>
      logs.portal['marketing'].error('ReviewDialog', 'review', {
        error,
        requestId: request.id,
        approve,
        msg: 'onReview failed',
      }),
    );
  };

  const actions = isPending ? (
    <>
      <DuncitButton onClick={onClose} disabled={saving}>
        Close
      </DuncitButton>
      <DuncitButton
        color="error"
        variant="outlined"
        startIcon={<CancelIcon />}
        onClick={() => review(false)}
        disabled={saving}
      >
        Reject
      </DuncitButton>
      <DuncitButton
        color="success"
        variant="contained"
        startIcon={<CheckCircleIcon />}
        onClick={() => review(true)}
        disabled={saving}
      >
        Approve
      </DuncitButton>
    </>
  ) : (
    <DuncitButton onClick={onClose} variant="contained">
      Close
    </DuncitButton>
  );

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{`${request.trace_id} · ${request.ad_title}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <ReviewDetails request={request} formatDateTime={formatDateTime} />
          {isPending && (
            <TextField
              label={t('marketing.adsApprovals.remarks')}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              placeholder={t('marketing.adsApprovals.optionalButRecommendedSharedWithThe')}
              helperText={t('marketing.adsApprovals.explainYourDecisionEspeciallyForRejections')}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>{actions}</DialogActions>
    </Dialog>
  );
}
