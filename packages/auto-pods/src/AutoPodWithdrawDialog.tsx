import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import type { AutoPodLabels, AutoPodRole, AutoPodRow } from '@duncit/utils';
import { HOST_WITHDRAW_AUTO_POD, VENUE_WITHDRAW_AUTO_POD } from './queries';
import { enrolmentFailure } from './failure-message';

export interface AutoPodWithdrawDialogProps {
  row: AutoPodRow | null;
  /** Whose enrolment is being taken back — a venue's slot or a host's assignment. */
  role: Extract<AutoPodRole, 'venue' | 'host'>;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onWithdrawn: () => void;
}

/**
 * Taking an enrolment back. The offer depends on more partners than the one
 * leaving, so the dialog says so in the product's own words and states the
 * Account Health cost (Pod Settings) before the button. Once confirmed the
 * offer goes back on the list for that role, and everyone else on it is told.
 * Native twin: `AutoPodWithdrawSheet` (rule 27).
 */
export function AutoPodWithdrawDialog({
  row,
  role,
  labels,
  open,
  onClose,
  onWithdrawn,
}: Readonly<AutoPodWithdrawDialogProps>) {
  const [failure, setFailure] = useState<string | null>(null);
  const [withdraw, withdrawState] = useMutation<any>(
    role === 'venue' ? VENUE_WITHDRAW_AUTO_POD : HOST_WITHDRAW_AUTO_POD,
  );
  const points = row?.withdraw_penalty_points ?? 0;

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  const handleWithdraw = async () => {
    if (!row) return;
    setFailure(null);
    try {
      await withdraw({ variables: { auto_pod_doc_id: row.id } });
      onWithdrawn();
      handleClose();
    } catch (err) {
      setFailure(enrolmentFailure(err, labels.loadFailed));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{labels.withdrawTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {row ? <Typography variant="subtitle2">{row.pod_title}</Typography> : null}
          <Alert severity="warning">{labels.withdrawWarning}</Alert>
          {points > 0 ? (
            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
              {labels.withdrawPenalty(points)}
            </Typography>
          ) : null}
          {failure ? <Alert severity="error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={handleClose}>{labels.dismiss}</DuncitButton>
        <DuncitButton
          variant="contained"
          color="error"
          onClick={handleWithdraw}
          disabled={withdrawState.loading}
        >
          {labels.withdrawConfirm}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
