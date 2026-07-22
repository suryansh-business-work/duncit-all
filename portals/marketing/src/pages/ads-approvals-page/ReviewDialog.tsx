import { useEffect, useState } from 'react';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { logs } from '@duncit/logs';
import ReviewDetails from './ReviewDetails';
import type { AdRequestRow } from './helpers';

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
      <Button onClick={onClose} disabled={saving}>
        Close
      </Button>
      <Button
        color="error"
        variant="outlined"
        startIcon={<CancelIcon />}
        onClick={() => review(false)}
        disabled={saving}
      >
        Reject
      </Button>
      <Button
        color="success"
        variant="contained"
        startIcon={<CheckCircleIcon />}
        onClick={() => review(true)}
        disabled={saving}
      >
        Approve
      </Button>
    </>
  ) : (
    <Button onClick={onClose} variant="contained">
      Close
    </Button>
  );

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{`${request.trace_id} · ${request.ad_title}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <ReviewDetails request={request} formatDateTime={formatDateTime} />
          {isPending && (
            <TextField
              label="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              placeholder="Optional, but recommended — shared with the advertiser"
              helperText="Explain your decision, especially for rejections."
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>{actions}</DialogActions>
    </Dialog>
  );
}
