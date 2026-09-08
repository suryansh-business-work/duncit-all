import { gql } from '@apollo/client';

/** The pod fields `PodCard` reads — the same selection the home feed makes. */
const PROFILE_POD_FIELDS = `
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_attendees
      seats_taken
      no_of_spots
      pod_hosts_id
      host_names
      pod_images_and_videos {
        url
        type
      }
      club_id
      club_slug
      location_id
      zone_name
      place_label
      place_detail
`;

/** Pods a member has joined — empty for a private account the viewer does not follow. */
export const USER_JOINED_PODS = gql`
  query UserJoinedPods($user_id: ID!) {
    userJoinedPods(user_id: $user_id) {
      ${PROFILE_POD_FIELDS}
    }
  }
`;

/** Live pods a member hosts. */
export const USER_HOSTED_PODS = gql`
  query UserHostedPods($user_id: ID!) {
    pods(filter: { host_user_id: $user_id, is_active: true }) {
      ${PROFILE_POD_FIELDS}
    }
  }
`;
