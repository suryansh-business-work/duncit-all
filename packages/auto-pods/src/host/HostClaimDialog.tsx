import { useState } from 'react';
import { useMutation } from '@apollo/client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AutoPodRow, AutoPodLabels } from '@duncit/utils';
import { HOST_ASSIGN_AUTO_POD } from '../queries';

export interface HostClaimDialogProps {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
}

/**
 * "Assign Myself" — the host takes the pod. The venue, date and price are
 * already fixed by the venue's enrolment, so this confirms rather than collects,
 * and shows what the host would earn under their own rates before they commit.
 */
export function HostClaimDialog({
  row,
  labels,
  open,
  onClose,
  onAssigned,
  formatWhen,
  formatMoney,
}: Readonly<HostClaimDialogProps>) {
  const [failure, setFailure] = useState<string | null>(null);
  const [assign, assignState] = useMutation(HOST_ASSIGN_AUTO_POD);

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  const handleAssign = async () => {
    if (!row) return;
    setFailure(null);
    try {
      await assign({ variables: { auto_pod_doc_id: row.id } });
      onAssigned();
      handleClose();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : labels.claimedElsewhere);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{labels.confirmAssign}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {labels.confirmAssignBody}
          </Typography>
          {row ? (
            <>
              <Typography variant="subtitle2">{row.pod_title}</Typography>
              {row.venue_claim ? (
                <Typography variant="body2">
                  {row.venue_claim.venue_name} · {formatWhen(row.venue_claim.pod_date_time)}
                </Typography>
              ) : null}
              {typeof row.expected_host_earnings === 'number' ? (
                <Typography variant="body2" sx={{
                  color: "success.main"
                }}>
                  {labels.expectedEarnings(formatMoney(row.expected_host_earnings))}
                </Typography>
              ) : null}
            </>
          ) : null}
          {failure ? <Alert severity="error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{labels.dismiss}</Button>
        <Button variant="contained" onClick={handleAssign} disabled={assignState.loading}>
          {labels.assignMyselfCta}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
