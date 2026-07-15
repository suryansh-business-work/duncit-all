import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import ClubPodsScheduleSection from '../club-details-page/ClubPodsScheduleSection';
import { usePricing } from '../../hooks/usePricing';

export const VENUE_PODS = gql`
  query VenueHostedPods($venueId: ID!) {
    pods(filter: { venue_id: $venueId, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      host_names
      pod_images_and_videos {
        url
        type
      }
      club_id
      club_slug
      pod_mode
      place_label
      place_detail
    }
  }
`;

/** "Pods at this venue" — every live pod hosted at the venue, in the same
 * Happening soon / Upcoming / Previous rails as the club page. Native twin:
 * details/VenuePodsSection. */
export default function VenuePodsSection({ venueId }: Readonly<{ venueId: string }>) {
  const navigate = useNavigate();
  const { format } = usePricing();
  const { data, loading } = useQuery(VENUE_PODS, {
    variables: { venueId },
    fetchPolicy: 'cache-and-network',
  });
  const pods = data?.pods ?? [];

  const openPod = (podDocId: string) => {
    const pod = pods.find((p: any) => p.id === podDocId);
    if (pod?.pod_id && pod.club_slug) navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`);
  };

  return (
    <Stack spacing={1} data-testid="venue-pods-section">
      <Typography variant="subtitle1" fontWeight={900}>
        Pods at this venue
      </Typography>
      {loading && !data ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <ClubPodsScheduleSection pods={pods} priceFormat={format} onOpen={openPod} />
      )}
    </Stack>
  );
}
