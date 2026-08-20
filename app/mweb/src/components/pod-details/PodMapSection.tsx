import { Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VideocamIcon from '@mui/icons-material/Videocam';
import EventIcon from '@mui/icons-material/Event';
import { Link as RouterLink } from 'react-router-dom';
import PodLocationMap from '../../pages/pod-details-page/PodLocationMap';
import VenueMapPreview from '../VenueMapPreview';
import { venueUrl } from '../../utils/seoUrls';
import { formatMeetingPlatform } from '../../utils/meetingPlatform';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime, formatTime } from '../../utils/dateFormat';

interface Props {
  pod: any;
  location?: any;
  venue?: any;
}

const formatStart = (iso?: string | null) => formatDateTime(iso) || '\u2014';

const formatEnd = (iso?: string | null) => formatTime(iso);

const venueParts = (venue: any) => [
  venue.venue_name,
  venue.address_line1,
  venue.address_line2,
  venue.locality,
  venue.city,
  venue.state,
  venue.postal_code,
  venue.country,
];

export default function PodMapSection({ pod, location, venue }: Readonly<Props>) {
  const { t } = useTranslation();
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const locationName = venue?.venue_name ?? location?.location_name ?? null;
  const zone = (location?.location_zones ?? []).find(
    (item: any) => item.zone_name === pod.zone_name
  );
  const pincode = zone?.pincode || location?.location_pincode || null;
  const placeText = venue ? venueParts(venue).filter(Boolean).join(', ') : locationName;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <EventIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('mweb.podDetails.timeAndVenue')}
        </Typography>
      </Stack>
      <Stack spacing={0.25}>
        <Typography variant="caption" color="text.secondary">
          {t('mweb.podDetails.when')}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {formatStart(pod.pod_date_time)}
          {pod.pod_end_date_time
            ? `  \u2192  ${formatEnd(pod.pod_end_date_time)}`
            : ''}
        </Typography>
      </Stack>
      {isVirtual ? (
        <Stack spacing={1}>
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {t('mweb.podDetails.meeting')}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatMeetingPlatform(pod.meeting_platform, t)}
            </Typography>
          </Stack>
          {pod.meeting_url ? (
            <Button
              variant="contained"
              startIcon={<VideocamIcon />}
              href={pod.meeting_url}
              target="_blank"
              rel="noreferrer"
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('mweb.podDetails.joinMeeting')}
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('mweb.podDetails.meetingLinkAfterJoin')}
            </Typography>
          )}
          {pod.meeting_notes && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {pod.meeting_notes}
            </Typography>
          )}
        </Stack>
      ) : (
        <>
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {t('mweb.podDetails.where')}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {placeText ?? '\u2014'}
            </Typography>
          </Stack>
          {venue ? (
            <Stack spacing={1}>
              <Button component={RouterLink} to={venueUrl(venue.id)} size="small" endIcon={<OpenInNewIcon fontSize="small" />} sx={{ alignSelf: 'flex-start' }}>
                {t('mweb.podDetails.venueDetails')}
              </Button>
              <VenueMapPreview title={venue.venue_name} parts={venueParts(venue)} lat={venue.lat} lng={venue.lng} />
            </Stack>
          ) : (
            <PodLocationMap locationName={locationName} zoneName={pod.zone_name} pincode={pincode} />
          )}
        </>
      )}
    </Stack>
  );
}
