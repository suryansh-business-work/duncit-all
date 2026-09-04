import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AutoPodLabels } from '@duncit/utils';

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

export interface HostProjectionLinesProps {
  /**
   * A projection the server has already answered with. Whether there is one to
   * draw at all is the caller's question — `HostEarningsFields` asks the host
   * for a price first — so this is never null by the time it gets here.
   */
  projection: AutoPodHostProjection;
  labels: AutoPodLabels;
  formatMoney: (amount: number) => string;
}

/** The earning breakdown for the numbers typed, or why they do not work. */
export function HostProjectionLines({
  projection,
  labels,
  formatMoney,
}: Readonly<HostProjectionLinesProps>) {
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
