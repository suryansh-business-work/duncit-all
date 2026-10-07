import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from '@duncit/shell';
import PodRequestStatusChip from '../PodRequestStatusChip';
import type { PodRequestDetail } from '../queries';

interface Summary {
  heading: string;
  image: string;
  name: string;
  lines: string[];
}

/** The other party: a venue owner reads the host, a host reads the venue. */
function useSummary(request: PodRequestDetail): Summary {
  const { t } = useTranslation();
  const distance =
    typeof request.distance_km === 'number'
      ? t('podRequests.distanceAway', { vars: { km: request.distance_km } })
      : '';
  if (request.viewer_side === 'VENUE') {
    const host = request.host;
    return {
      heading: t('podRequests.hostDetails'),
      image: host?.photo_url ?? '',
      name: host?.name ?? '',
      lines: [host?.categories.join(', ') ?? '', distance],
    };
  }
  const venue = request.venue;
  return {
    heading: t('podRequests.venueDetails'),
    image: venue?.cover_image_url ?? '',
    name: venue?.venue_name ?? '',
    lines: [
      [venue?.category, venue?.venue_type].filter(Boolean).join(' · '),
      venue?.capacity ? t('podRequests.capacity', { vars: { count: venue.capacity } }) : '',
      [venue?.locality, venue?.city].filter(Boolean).join(', '),
      distance,
    ],
  };
}

/** Who the request is with, its state, and the note it was sent with. */
export default function CounterpartCard({ request }: Readonly<{ request: PodRequestDetail }>) {
  const { t } = useTranslation();
  const summary = useSummary(request);
  const isHost = request.viewer_side === 'VENUE';

  return (
    <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar
            src={summary.image || undefined}
            alt=""
            variant={isHost ? 'circular' : 'rounded'}
            sx={(theme) => ({ width: theme.spacing(8), height: theme.spacing(8) })}
          >
            {summary.name.charAt(0)}
          </Avatar>
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.25}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              {summary.heading}
            </Typography>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
              {summary.name}
            </Typography>
            {summary.lines.filter(Boolean).map((line) => (
              <Typography key={line} variant="body2" sx={{ color: 'text.secondary' }}>
                {line}
              </Typography>
            ))}
          </Stack>
          <PodRequestStatusChip status={request.status} />
        </Stack>
        {request.note && (
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
              {t('podRequests.noteTitle')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {request.note}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
