import { gql } from '@/generated/graphql';

/** Full pod for the details screen — core fields (mWeb's POD_DETAILS subset). */
export const PodDetailsDocument = gql(`
  query MobilePodDetails($podId: ID!) {
    me {
      user_id
      saved_pod_ids
    }
    pod(pod_doc_id: $podId) {
      id
      pod_id
      pod_title
      pod_description
      pod_info
      pod_images_and_videos {
        url
        type
      }
      pod_hosts_id
      host_names
      pod_attendees
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      no_of_spots
      zone_name
      club_id
      club_slug
      place_label
      place_detail
      what_this_pod_offers
      available_perks
      like_count
      liked_by_me
      comment_count
    }
  }
`);

/** Club + its active pods for the club-details screen. */
export const ClubDetailsDocument = gql(`
  query MobileClubDetails($clubId: ID!) {
    club(club_doc_id: $clubId) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
      club_whats_app_community_link
      club_whats_app_group_link
      meetup_venues_id
      category_id
    }
    pods(filter: { club_id: $clubId, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
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
      place_label
      place_detail
    }
  }
`);
