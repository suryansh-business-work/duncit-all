import { gql } from '@apollo/client';
export { default as PodDetailsSkeleton } from './PodDetailsSkeleton';

export const POD_ID_BY_SLUGS = gql`
  query PodIdBySlugs($clubSlug: String!, $podSlug: String!) {
    podBySlugs(club_slug: $clubSlug, pod_slug: $podSlug) {
      id
      pod_id
      club_slug
    }
  }
`;

export const POD_DETAILS = gql`
  query PodDetails($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_id
      pod_title
      pod_description
      pod_info
      pod_hashtag
      pod_images_and_videos {
        url
        type
      }
      pod_hits
      pod_hosts_id
      pod_attendees
      pod_date_time
      pod_end_date_time
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      zone_name
      club_id
      club_slug
      location_id
      venue_id
      what_this_pod_offers
      available_perks
      payment_terms
      place_charges {
        label
        amount
        note
      }
      products_enabled
      product_requests {
        product_id
        product_name
        unit_cost
        quantity
        total_cost
      }
      product_cost_total
      like_count
      liked_by_me
      comment_count
    }
    podMembershipState(pod_doc_id: $id) {
      pod_id
      is_member
      status
      can_backout
      can_join
      spots_taken
      spots_total
      refund_threshold_pct
      membership {
        id
        status
        referral_token
        refund_status
      }
    }
    clubs {
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
    }
    locations {
      id
      location_name
      location_image
      location_pincode
      location_zones {
        zone_name
        pincode
      }
    }
    publicVenues { id venue_name address_line1 address_line2 locality city state country postal_code lat lng }
    publicHosts { id user_id full_name passport_photo_url }
    me { user_id saved_pod_ids following_pod_ids }
  }
`;

export const FOLLOW_POD = gql`
  mutation FollowPod($pod_id: ID!) {
    followPod(pod_id: $pod_id) {
      user_id
      following_pod_ids
    }
  }
`;

export const UNFOLLOW_POD = gql`
  mutation UnfollowPod($pod_id: ID!) {
    unfollowPod(pod_id: $pod_id) {
      user_id
      following_pod_ids
    }
  }
`;

export const POD_PEOPLE = gql`
  query PodPeople($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`;

export const INC_HITS = gql`
  mutation IncPodHits($id: ID!) {
    incrementPodHits(pod_doc_id: $id) { id pod_hits }
  }
`;

export const JOIN_FREE = gql`
  mutation JoinFreePod($id: ID!, $referral: String) {
    joinFreePod(pod_doc_id: $id, referral_token: $referral) { id status }
  }
`;

export const BACKOUT = gql`
  mutation BackoutPod($id: ID!) {
    backoutPod(pod_doc_id: $id) { id status referral_token refund_status }
  }
`;

export const REDEEM = gql`
  mutation RedeemReferral($token: String!) {
    redeemPodReferral(token: $token) { id status }
  }
`;

export const TOGGLE_POD_LIKE = gql`
  mutation TogglePodLike($id: ID!) {
    togglePodLike(pod_doc_id: $id) {
      id
      like_count
      liked_by_me
    }
  }
`;

export const POD_COMMENTS = gql`
  query PodComments($id: ID!) {
    podComments(pod_doc_id: $id) {
      id
      author_id
      author_name
      author_photo
      text
      created_at
    }
  }
`;

export const ADD_POD_COMMENT = gql`
  mutation AddPodComment($id: ID!, $text: String!) {
    addPodComment(pod_doc_id: $id, text: $text) {
      id
      author_id
      author_name
      author_photo
      text
      created_at
    }
  }
`;

export const DELETE_POD_COMMENT = gql`
  mutation DeletePodComment($id: ID!, $comment_id: ID!) {
    deletePodComment(pod_doc_id: $id, comment_id: $comment_id)
  }
`;

export const TOGGLE_SAVED_POD_DETAIL = gql`
  mutation ToggleSavedPodDetail($pod_doc_id: ID!) {
    toggleSavedPod(pod_doc_id: $pod_doc_id) {
      pod_id
      saved
      saved_pod_ids
    }
  }
`;

