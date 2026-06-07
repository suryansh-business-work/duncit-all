import { gql } from '@/generated/graphql';

/** Full pod for the details screen — mirrors mWeb's POD_DETAILS so the mobile
 * screen reaches feature parity (mode, meeting, products, venue/location). */
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
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_type
      pod_amount
      no_of_spots
      zone_name
      club_id
      club_slug
      location_id
      venue_id
      place_label
      place_detail
      what_this_pod_offers
      available_perks
      payment_terms
      pod_hits
      pod_occurrence
      place_charges {
        label
        amount
        note
      }
      products_enabled
      product_requests {
        product_id
        product_name
        image_url
        images
        unit_cost
        quantity
        available_count
        total_cost
      }
      like_count
      liked_by_me
      comment_count
    }
    locations {
      id
      location_name
      location_pincode
      location_zones {
        zone_name
        pincode
      }
    }
    publicVenues {
      id
      venue_name
      address_line1
      address_line2
      locality
      city
      state
      country
      postal_code
      lat
      lng
    }
  }
`);

/** Comments thread for a pod (auth) — mirrors mWeb's POD_COMMENTS. */
export const PodCommentsDocument = gql(`
  query MobilePodComments($podId: ID!) {
    podComments(pod_doc_id: $podId) {
      id
      author_id
      author_name
      author_photo
      text
      created_at
    }
  }
`);

/** Add a comment to a pod (auth). */
export const AddPodCommentDocument = gql(`
  mutation MobileAddPodComment($podId: ID!, $text: String!) {
    addPodComment(pod_doc_id: $podId, text: $text) {
      id
      author_id
      author_name
      author_photo
      text
      created_at
    }
  }
`);

/** Delete one of the viewer's own comments (auth). */
export const DeletePodCommentDocument = gql(`
  mutation MobileDeletePodComment($podId: ID!, $commentId: ID!) {
    deletePodComment(pod_doc_id: $podId, comment_id: $commentId)
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
