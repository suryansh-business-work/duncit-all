import { gql } from '@/generated/graphql';

/**
 * The pods a profile's tabs list — RN twins of mWeb's profile-tabs/queries.ts.
 *
 * Both select exactly the fields the shared PodCard reads (the same set as
 * MobileMySavedPods), written out in full because this app's codegen only sees
 * a literal string passed to `gql()`.
 */

/** Pods a member has joined — empty for a private account the viewer does not follow. */
export const MobileUserJoinedPodsDocument = gql(`
  query MobileUserJoinedPods($user_id: ID!) {
    userJoinedPods(user_id: $user_id) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      no_of_spots
      pod_attendees
      seats_taken
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
`);

/** Live pods a member hosts. */
export const MobileUserHostedPodsDocument = gql(`
  query MobileUserHostedPods($user_id: ID!) {
    pods(filter: { host_user_id: $user_id, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      no_of_spots
      pod_attendees
      seats_taken
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
`);
