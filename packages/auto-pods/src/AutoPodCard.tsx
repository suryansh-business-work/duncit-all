import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import PlaceIcon from '@mui/icons-material/Place';
import EventIcon from '@mui/icons-material/Event';
import { autoPodWaitingOn, type AutoPodRow, type AutoPodLabels } from '@duncit/utils';
import { AutoPodTicks } from './AutoPodTicks';

export interface AutoPodCardProps {
  row: AutoPodRow;
  labels: AutoPodLabels;
  /** Formats the slot window in the viewer's configured date/time settings. */
  formatWhen: (iso: string) => string;
  /** Formats money in the viewer's currency. */
  formatMoney: (amount: number) => string;
  /** The role's primary button — the caller owns the action. */
  action?: ReactNode;
}

const firstImage = (row: AutoPodRow): string | null =>
  row.pod_images_and_videos.find((m) => (m.type ?? 'IMAGE') === 'IMAGE')?.url ?? null;

/**
 * One Auto Pod, as every role sees it. The card itself is role-agnostic: the
 * three enrolment ticks and the pod's own details read the same to a venue, a
 * host and a club admin, and only the button differs — which is why the caller
 * passes it in rather than the card branching per role.
 */
export function AutoPodCard({
  row,
  labels,
  formatWhen,
  formatMoney,
  action,
}: Readonly<AutoPodCardProps>) {
  const image = firstImage(row);
  const waitingOn = autoPodWaitingOn(row);
  const venue = row.venue_claim;

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {image ? <CardMedia component="img" height="150" image={image} alt="" /> : null}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flexGrow: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} noWrap title={row.pod_title}>
            {row.pod_title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.auto_pod_no}
            {row.category_name ? ` · ${row.category_name}` : ''}
          </Typography>
        </Box>

        <AutoPodTicks row={row} labels={labels} />

        {venue ? (
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PlaceIcon fontSize="small" color="action" />
              <Typography variant="body2" noWrap title={venue.venue_name}>
                {venue.venue_name}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <EventIcon fontSize="small" color="action" />
              <Typography variant="body2">{formatWhen(venue.pod_date_time)}</Typography>
            </Stack>
          </Stack>
        ) : null}

        <Divider />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" variant="outlined" label={`${labels.priceLabel}: ${formatMoney(row.pod_amount)}`} />
          <Chip size="small" variant="outlined" label={`${labels.spotsLabel}: ${row.no_of_spots}`} />
        </Stack>

        {typeof row.expected_host_earnings === 'number' ? (
          <Typography variant="body2" color="success.main">
            {labels.expectedEarnings(formatMoney(row.expected_host_earnings))}
          </Typography>
        ) : null}

        {waitingOn ? (
          <Typography variant="caption" color="text.secondary">
            {labels.waitingOn(waitingOn)}
          </Typography>
        ) : null}

        <Box sx={{ mt: 'auto', pt: 1 }}>{action}</Box>
      </CardContent>
    </Card>
  );
}
