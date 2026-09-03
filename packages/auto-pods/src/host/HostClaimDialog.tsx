import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import {
  autoPodCityLabel,
  autoPodHostNeedsLocation,
  type AutoPodRow,
  type AutoPodLabels,
} from '@duncit/utils';
import { AUTO_POD_HOST_PROJECTION, HOST_ASSIGN_AUTO_POD } from '../queries';
import { enrolmentFailure } from '../failure-message';

/** What the host's numbers add up to, after every deduction Finance takes. */
export interface AutoPodHostProjection {
  min_spots: number;
  max_spots: number;
  pod_amount: number;
  no_of_spots: number;
  total_collection: number;
  gst_amount: number;
  platform_fee_amount: number;
  venue_amount: number;
  club_admin_amount: number;
  host_receives: number;
  viable: boolean;
}

interface ProjectionData {
  autoPodHostProjection: AutoPodHostProjection;
}

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

/** The earning breakdown for the numbers typed, or why they do not work. */
function ProjectionLines({
  projection,
  labels,
  formatMoney,
}: Readonly<{ projection: AutoPodHostProjection | null; labels: AutoPodLabels; formatMoney: (amount: number) => string }>) {
  if (!projection) return null;
  if (!projection.viable) return <Alert severity="warning">{labels.projectionNotViable}</Alert>;
  const fees = projection.gst_amount + projection.platform_fee_amount;
  return (
    <Stack spacing={0.25} data-testid="auto-pod-host-projection">
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {labels.projectionTitle}
      </Typography>
      <Typography variant="subtitle2" sx={{ color: 'success.main' }}>
        {labels.projectionHost(formatMoney(projection.host_receives))}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {labels.projectionVenue(formatMoney(projection.venue_amount))} ·{' '}
        {labels.projectionClub(formatMoney(projection.club_admin_amount))} ·{' '}
        {labels.projectionFees(formatMoney(fees))}
      </Typography>
    </Stack>
  );
}

/**
 * "Assign Myself" — the host takes the pod, and sets its ticket price and
 * number of spots (within the activity's minimum and the venue's capacity).
 * Every change re-prices the pod on the server under the host's own rates,
 * the venue's slot price and the club admin's cut, so what the dialog shows as
 * "you earn" is exactly what the save is judged on.
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
  const [amount, setAmount] = useState(0);
  const [spots, setSpots] = useState(0);
  const [assign, assignState] = useMutation<any>(HOST_ASSIGN_AUTO_POD);

  // The template's numbers are the starting point; a fresh offer resets them.
  useEffect(() => {
    setAmount(row?.pod_amount ?? 0);
    setSpots(row?.no_of_spots ?? 0);
    setFailure(null);
  }, [row?.id]);

  const projectionQuery = useQuery<ProjectionData>(AUTO_POD_HOST_PROJECTION, {
    variables: { auto_pod_doc_id: row?.id ?? '', pod_amount: amount, no_of_spots: spots },
    skip: !open || !row || amount <= 0 || spots <= 0,
    fetchPolicy: 'network-only',
  });
  const projection = projectionQuery.data?.autoPodHostProjection ?? null;
  const inRange =
    !!projection && spots >= projection.min_spots && spots <= projection.max_spots;

  const needsLocation = row ? autoPodHostNeedsLocation(row, locationId) : false;
  const pinsCity = !!row && !row.location && !!locationId;
  const canAssign =
    !!row && !needsLocation && !!projection && projection.viable && inRange && !assignState.loading;
  const locked = !!row && !canAssign;

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  const handleAssign = async () => {
    if (!row || !canAssign) return;
    setFailure(null);
    try {
      await assign({
        variables: {
          auto_pod_doc_id: row.id,
          location_id: row.location ? null : locationId,
          pod_amount: amount,
          no_of_spots: spots,
        },
      });
      onAssigned();
      handleClose();
    } catch (err) {
      setFailure(enrolmentFailure(err, labels.claimedElsewhere));
    }
  };

  const spotsHint = projection ? labels.spotsRange(projection.min_spots, projection.max_spots) : undefined;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
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

          <TextField
            label={labels.ticketPrice}
            type="number"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value) || 0)}
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 1999 } }}
          />
          <TextField
            label={labels.spotsField}
            type="number"
            value={spots}
            onChange={(event) => setSpots(Number(event.target.value) || 0)}
            fullWidth
            error={!!projection && !inRange}
            helperText={spotsHint}
            slotProps={{
              htmlInput: { min: projection?.min_spots ?? 2, max: projection?.max_spots ?? 999 },
            }}
          />

          <ProjectionLines projection={projection} labels={labels} formatMoney={formatMoney} />

          {needsLocation ? <Alert severity="warning">{labels.pickLocationFirst}</Alert> : null}
          {pinsCity ? (
            <Alert severity="info">{labels.willPinTo(locationLabel || locationId)}</Alert>
          ) : null}
          {failure ? <Alert severity="error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={handleClose}>{labels.dismiss}</DuncitButton>
        <DuncitButton variant="contained" onClick={handleAssign} disabled={locked}>
          {labels.assignMyselfCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
