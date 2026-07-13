import { useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import ReviewDetails from './ReviewDetails';
import type { ApprovalRequest } from './helpers';

interface Props {
  request: ApprovalRequest | null;
  saving: boolean;
  error: string | null;
  formatDateTime: (s: string) => string;
  onClose: () => void;
  onApprove: (id: string) => Promise<void> | void;
  onDeny: (id: string, notes: string) => Promise<void> | void;
}

export default function ReviewDialog({
  request,
  saving,
  error,
  formatDateTime,
  onClose,
  onApprove,
  onDeny,
}: Readonly<Props>) {
  const [denying, setDenying] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setDenying(false);
    setNotes('');
  }, [request?.id]);

  if (!request) return null;

  const isPending = request.status === 'PENDING';

  const handleDeny = () => {
    if (!denying) {
      setDenying(true);
      return;
    }
    // onDeny may be sync or async — normalise so a rejection is reported, not dropped.
    Promise.resolve(onDeny(request.id, notes.trim())).catch(console.error);
  };

  const actions = isPending ? (
    <>
      <Button onClick={onClose} disabled={saving}>
        Close
      </Button>
      <Button
        color="error"
        variant={denying ? 'contained' : 'outlined'}
        startIcon={<CancelIcon />}
        onClick={handleDeny}
        disabled={saving || (denying && notes.trim().length === 0)}
      >
        {denying ? 'Confirm Deny' : 'Deny'}
      </Button>
      <Button
        color="success"
        variant="contained"
        startIcon={<CheckCircleIcon />}
        onClick={() => onApprove(request.id)}
        disabled={saving || denying}
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
    <ResponsiveDialog
      open={!!request}
      onClose={saving ? () => {} : onClose}
      title={request.title || 'Review Request'}
      maxWidth="sm"
      actions={actions}
    >
      <Stack spacing={2}>
        <ReviewDetails request={request} formatDateTime={formatDateTime} />
        {denying && (
          <TextField
            label="Reason for denial"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            required
            placeholder="Explain why this request is being denied"
          />
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </ResponsiveDialog>
  );
}
