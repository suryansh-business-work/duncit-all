import { Avatar, Box, Card, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import type { PodRequestDetail } from '../pod-requests/queries';
import PodRequestStatusChip from '../pod-requests/components/PodRequestStatusChip';
import { formatKm } from '../pod-requests/counterpart';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  request: PodRequestDetail;
}

/** Who the request is with: the venue (to a host) or the host (to a venue owner) — never their contact. */
export default function CounterpartCard({ request }: Readonly<Props>) {
  const { t } = useTranslation();
  const isVenue = request.viewer_side === 'HOST';
  const venue = request.venue;
  const host = request.host;
  const name = isVenue ? venue?.venue_name : host?.name;
  const image = isVenue ? venue?.cover_image_url : host?.photo_url;
  const capacity = venue?.capacity ?? 0;
  const venueLines = [
    [venue?.category, venue?.venue_type].filter(Boolean).join(' · '),
    capacity > 0 ? t('podRequests.capacity', { vars: { count: capacity } }) : '',
    [venue?.locality, venue?.city].filter(Boolean).join(', '),
  ];
  const lines = isVenue ? venueLines : [(host?.categories ?? []).join(' · ')];

  return (
    <Card sx={{ p: 2 }} data-testid="pod-request-counterpart">
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {isVenue ? t('podRequests.venueDetails') : t('podRequests.hostDetails')}
          </Typography>
          <PodRequestStatusChip status={request.status} testId="pod-request-status" />
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar
            variant={isVenue ? 'rounded' : 'circular'}
            src={image || undefined}
            alt=""
            sx={{ width: 72, height: 72, bgcolor: 'action.hover', color: 'primary.main' }}
          >
            {isVenue ? <StorefrontRoundedIcon /> : <PersonRoundedIcon />}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {name}
            </Typography>
            {lines.filter(Boolean).map((line) => (
              <Typography key={line} variant="body2" sx={{ color: 'text.secondary' }}>
                {line}
              </Typography>
            ))}
            {request.distance_km !== null && (
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {t('podRequests.distanceAway', { vars: { km: formatKm(request.distance_km) } })}
              </Typography>
            )}
          </Box>
        </Stack>
        {request.note && (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t('podRequests.noteTitle')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {request.note}
            </Typography>
          </Box>
        )}
      </Stack>
    </Card>
  );
}
