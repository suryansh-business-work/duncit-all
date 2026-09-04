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
import { ambientDateFormatter } from '@duncit/datetime';
import {
  autoPodCityLabel,
  autoPodHostMeetingReady,
  autoPodHostNeedsLocation,
  type AutoPodHostMeeting,
  type AutoPodRow,
  type AutoPodLabels,
} from '@duncit/utils';
import { HOST_ASSIGN_AUTO_POD } from '../queries';
import { enrolmentFailure } from '../failure-message';
import { BLANK_HOST_MEETING, HostMeetingFields, hostMeetingInput } from './HostMeetingFields';
import { HostEarningsFields } from './HostEarningsFields';
import { useHostProjection } from './useHostProjection';

export interface HostClaimDialogProps {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /**
   * The city selected at the top of the host's page ('' when none). A virtual
   * offer nobody has enrolled in yet takes its city from the host, so without
   * one the button stays off and the dialog says why; a pinned offer already
   * has its city and this is only checked against it.
   */
  locationId: string;
  /** Display name of that city, for the "will be set to" line. */
  locationLabel?: string;
}

/**
 * "Assign Myself" — the host takes the pod, priced through the same potential-
 * earnings calculator Step 4 of Create a Pod uses: a ticket price and a spots
 * slider bounded by the activity's minimum and the venue's capacity, with the
 * server re-pricing the pod on every change under the host's own rates, the
 * venue's slot price and the club admin's cut. What the dialog shows as "you
 * earn" is exactly what the save is judged on.
 *
 * On a VIRTUAL offer the host also brings the meeting link and the window —
 * there is no venue to fix them — and the button waits until
 * `autoPodHostMeetingReady` says they hold.
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
  const [meeting, setMeeting] = useState<AutoPodHostMeeting>(BLANK_HOST_MEETING);
  const [assign, assignState] = useMutation<any>(HOST_ASSIGN_AUTO_POD);

  // The calculator owns the price and the spots, and re-seeds itself per offer.
  const pricing = useHostProjection(
    row?.id ?? null,
    { pod_amount: row?.pod_amount ?? 0, no_of_spots: row?.no_of_spots ?? 0 },
    open
  );

  const virtual = row?.pod_mode === 'VIRTUAL';
  // The admin-configured clock (rule 11): the earliest start a host may pick.
  const now = new Date(ambientDateFormatter().clock.nowMs());
  const meetingReady = !virtual || autoPodHostMeetingReady(meeting, now.getTime());
  const needsLocation = row ? autoPodHostNeedsLocation(row, locationId) : false;
  const pinsCity = !!row && !row.location && !!locationId;
  // What an assignment would commit — only once there is an offer, a city
  // where the offer takes one from the host, numbers the server priced as
  // viable and, on a virtual offer, a complete meeting. The button is the only
  // way in, and it stays shut until then.
  const target =
    row && !needsLocation && pricing.viable && meetingReady && !assignState.loading ? row : null;

  const handleClose = () => {
    setFailure(null);
    setMeeting(BLANK_HOST_MEETING);
    onClose();
  };

  const assignTo = async (chosen: NonNullable<typeof target>) => {
    setFailure(null);
    try {
      await assign({
        variables: {
          auto_pod_doc_id: chosen.id,
          location_id: chosen.location ? null : locationId,
          pod_amount: pricing.amount,
          no_of_spots: pricing.spots,
          // Only a virtual offer carries a meeting; a physical one sends none.
          ...(virtual ? { meeting: hostMeetingInput(meeting) } : {}),
        },
      });
      onAssigned();
      handleClose();
    } catch (err) {
      setFailure(enrolmentFailure(err, labels.claimedElsewhere));
    }
  };
  const handleAssign = target ? () => assignTo(target) : undefined;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{labels.confirmAssign}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.confirmAssignBody}
          </Typography>
          {row ? (
            <>
              <Typography variant="subtitle2">{row.pod_title}</Typography>
              {row.location ? (
                <Typography variant="body2">{labels.pinnedTo(autoPodCityLabel(row.location))}</Typography>
              ) : null}
              {row.venue_claim ? (
                <Typography variant="body2">
                  {row.venue_claim.venue_name} · {formatWhen(row.venue_claim.pod_date_time)}
                </Typography>
              ) : null}
            </>
          ) : null}

          {virtual ? (
            <HostMeetingFields value={meeting} onChange={setMeeting} labels={labels} now={now} />
          ) : null}

          <HostEarningsFields state={pricing} labels={labels} formatMoney={formatMoney} />

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
          disabled={!handleAssign}
          loading={assignState.loading}
        >
          {labels.assignMyselfCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
