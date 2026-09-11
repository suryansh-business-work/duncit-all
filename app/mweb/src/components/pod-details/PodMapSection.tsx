import { Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventIcon from '@mui/icons-material/EventOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import VideocamIcon from '@mui/icons-material/VideocamOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Link as RouterLink } from 'react-router';
import PodLocationMap from '../../pages/pod-details-page/PodLocationMap';
import VenueMapPreview from '../VenueMapPreview';
import SectionHeader from '../SectionHeader';
import JoinMeetingButton from './JoinMeetingButton';
import PodMetaRow from './PodMetaRow';
import { SURFACE_SX } from '../../theme';
import { venueUrl } from '../../utils/seoUrls';
import { formatMeetingPlatform } from '../../utils/meetingPlatform';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime, formatTime } from '../../utils/dateFormat';

interface Props {
  pod: any;
  location?: any;
  venue?: any;
  /** Fetches the meeting link through `joinPodMeeting` — the call itself is
   * the attendance mark, so the button must never link to the pod field. */
  onJoinMeeting: () => Promise<string>;
}

const formatStart = (iso?: string | null) => formatDateTime(iso) || '—';

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

/** The meta rows' value line — ink, medium weight. */
const valueSx = { fontWeight: 600, overflowWrap: 'anywhere' } as const;

/** Time & Venue: when it runs, then where (or how to join, for a virtual pod),
 * each as an icon row, with the map under it. Native twin: details/PodSchedule. */
export default function PodMapSection({ pod, location, venue, onJoinMeeting }: Readonly<Props>) {
  const { t } = useTranslation();
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const locationName = venue?.venue_name ?? location?.location_name ?? null;
  const zone = (location?.location_zones ?? []).find(
    (item: any) => item.zone_name === pod.zone_name
  );
  const pincode = zone?.pincode || location?.location_pincode || null;
  const placeText = venue ? venueParts(venue).filter(Boolean).join(', ') : locationName;
  const endText = pod.pod_end_date_time ? `  →  ${formatEnd(pod.pod_end_date_time)}` : '';

  return (
    <Stack spacing={2} sx={{ ...SURFACE_SX, p: 2 }}>
      <SectionHeader title={t('mweb.podDetails.timeAndVenue')} />
      <PodMetaRow icon={<EventIcon />}>
        <Typography variant="body2" sx={valueSx}>
          {formatStart(pod.pod_date_time)}
          {endText}
        </Typography>
      </PodMetaRow>
      {isVirtual ? (
        <Stack spacing={1.5}>
          <PodMetaRow icon={<VideocamIcon />}>
            <Typography variant="body2" sx={valueSx}>
              {formatMeetingPlatform(pod.meeting_platform, t)}
            </Typography>
          </PodMetaRow>
          {pod.meeting_url ? (
            <JoinMeetingButton onJoin={onJoinMeeting} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('mweb.podDetails.meetingLinkAfterJoin')}
            </Typography>
          )}
          {pod.meeting_notes && (
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
              {pod.meeting_notes}
            </Typography>
          )}
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          <PodMetaRow icon={<PlaceIcon />}>
            <Typography variant="body2" sx={valueSx}>
              {placeText ?? '—'}
            </Typography>
            {venue && (
              <DuncitButton
                component={RouterLink}
                to={venueUrl(venue.id)}
                size="small"
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{ px: 0, minHeight: 32, '&:hover': { bgcolor: 'transparent' } }}
              >
                {t('mweb.podDetails.venueDetails')}
              </DuncitButton>
            )}
          </PodMetaRow>
          {venue ? (
            <VenueMapPreview title={venue.venue_name} parts={venueParts(venue)} lat={venue.lat} lng={venue.lng} />
          ) : (
            <PodLocationMap locationName={locationName} zoneName={pod.zone_name} pincode={pincode} />
          )}
        </Stack>
      )}
    </Stack>
  );
}
