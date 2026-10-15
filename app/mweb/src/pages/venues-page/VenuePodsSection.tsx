import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import PodsScheduleBlock, { type SchedulePod } from '../../components/public-page/PodsScheduleBlock';
import { RequestEventCard } from '../../components/event-request';

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
 * Happening soon / Upcoming / Previous rails as the club page. Given the
 * venue's name (its own page), nothing coming up offers "Request an event".
 * Native twin: details/VenuePodsSection. */
export default function VenuePodsSection({
  venueId,
  title = 'Pods at this venue',
  venueName,
}: Readonly<{ venueId: string; title?: string; venueName?: string }>) {
  const { data, loading } = useQuery<{ pods: SchedulePod[] }>(VENUE_PODS, {
    variables: { venueId },
    fetchPolicy: 'cache-and-network',
  });

  return (
    <PodsScheduleBlock
      testId="venue-pods-section"
      title={title}
      pods={data?.pods ?? []}
      loading={loading && !data}
      whenNothingUpcoming={
        venueName === undefined ? undefined : (
          <RequestEventCard targetType="VENUE" targetId={venueId} targetName={venueName} />
        )
      }
    />
  );
}
