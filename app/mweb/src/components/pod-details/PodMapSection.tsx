import { Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VideocamIcon from '@mui/icons-material/Videocam';
import EventIcon from '@mui/icons-material/Event';
import { Link as RouterLink } from 'react-router-dom';
import PodLocationMap from '../../pages/pod-details-page/PodLocationMap';
import VenueMapPreview from '../VenueMapPreview';
import { venueUrl } from '../../utils/seoUrls';
import { formatMeetingPlatform } from '../../utils/meetingPlatform';

interface Props {
  pod: any;
  location?: any | null;
  venue?: any | null;
}

const formatStart = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '\u2014';

const formatEnd = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

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
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          Time &amp; Venue
        </Typography>
      </Stack>
      <Stack spacing={0.25}>
        <Typography variant="caption" color="text.secondary">
          When
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
              Meeting
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatMeetingPlatform(pod.meeting_platform)}
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
              Join meeting
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Meeting link will be visible after joining this pod.
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
              Where
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {placeText ?? '\u2014'}
            </Typography>
          </Stack>
          {venue ? (
            <Stack spacing={1}>
              <Button component={RouterLink} to={venueUrl(venue.id)} size="small" endIcon={<OpenInNewIcon fontSize="small" />} sx={{ alignSelf: 'flex-start' }}>
                Venue details
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
