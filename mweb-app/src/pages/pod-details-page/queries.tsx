import { gql } from '@apollo/client';
import { Skeleton, Stack } from '@mui/material';

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
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      zone_name
      club_id
      location_id
      what_this_pod_offers
      available_perks
      payment_terms
      place_charges {
        label
        amount
        note
      }
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
    }
    publicHosts {
      id
      user_id
      full_name
      passport_photo_url
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
    incrementPodHits(pod_doc_id: $id) {
      id
      pod_hits
    }
  }
`;

export const JOIN_FREE = gql`
  mutation JoinFreePod($id: ID!, $referral: String) {
    joinFreePod(pod_doc_id: $id, referral_token: $referral) {
      id
      status
    }
  }
`;

export const BACKOUT = gql`
  mutation BackoutPod($id: ID!) {
    backoutPod(pod_doc_id: $id) {
      id
      status
      referral_token
      refund_status
    }
  }
`;

export const REDEEM = gql`
  mutation RedeemReferral($token: String!) {
    redeemPodReferral(token: $token) {
      id
      status
    }
  }
`;

export function PodDetailsSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      <Skeleton width="60%" height={40} />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={80} height={28} />
        <Skeleton variant="rounded" width={120} height={28} />
        <Skeleton variant="rounded" width={100} height={28} />
      </Stack>
      <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
      <Skeleton variant="text" height={28} width="40%" />
      <Skeleton variant="text" height={20} />
      <Skeleton variant="text" height={20} width="80%" />
    </Stack>
  );
}
