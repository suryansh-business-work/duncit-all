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
import {
  autoPodCityLabel,
  autoPodHostNeedsLocation,
  type AutoPodRow,
  type AutoPodLabels,
} from '@duncit/utils';
import { HOST_ASSIGN_AUTO_POD } from '../queries';
import { enrolmentFailure } from '../failure-message';

export interface HostClaimDialogProps {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /**
   * The city selected at the top of the host's page ('' when none). An offer
   * nobody has enrolled in yet takes its city from the host, so without one
   * the button stays off and the dialog says why; a pinned offer already has
   * its city and this is only checked against it.
   */
  locationId: string;
  /** Display name of that city, for the "will be set to" line. */
  locationLabel?: string;
}

/**
 * "Assign Myself" — the host takes the pod. Whatever a venue has already fixed
 * (date, price) is shown, and the host sees what they would earn under their
 * own rates once a venue has priced it.
 */
export function HostClaimDialog({
  row,
  labels,
  open,
  onClose,
  onAssigned,
  formatWhen,
  formatMoney,
  locationId,
  locationLabel,
}: Readonly<HostClaimDialogProps>) {
  const [failure, setFailure] = useState<string | null>(null);
  const [assign, assignState] = useMutation<any>(HOST_ASSIGN_AUTO_POD);

  const needsLocation = row ? autoPodHostNeedsLocation(row, locationId) : false;
  const pinsCity = !!row && !row.location && !!locationId;

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  const handleAssign = async () => {
    if (!row || needsLocation) return;
    setFailure(null);
    try {
      await assign({
        variables: { auto_pod_doc_id: row.id, location_id: row.location ? null : locationId },
      });
      onAssigned();
      handleClose();
    } catch (err) {
      setFailure(enrolmentFailure(err, labels.claimedElsewhere));
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
              {row.location ? (
                <Typography variant="body2">
                  {labels.pinnedTo(autoPodCityLabel(row.location))}
                </Typography>
              ) : null}
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
          {needsLocation ? <Alert severity="warning">{labels.pickLocationFirst}</Alert> : null}
          {pinsCity ? (
            <Alert severity="info">{labels.willPinTo(locationLabel || locationId)}</Alert>
          ) : null}
          {failure ? <Alert severity="error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={handleClose}>{labels.dismiss}</DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={handleAssign}
          disabled={assignState.loading || needsLocation}
        >
          {labels.assignMyselfCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
