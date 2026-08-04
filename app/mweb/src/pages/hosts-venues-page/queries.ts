import { gql } from '@apollo/client';

export const PUBLIC_HOSTS = gql`
  query PublicHosts {
    me {
      user_id
      following_user_ids
      requested_user_ids
    }
    publicHosts {
      id
      user_id
      full_name
      email
      passport_photo_url
      full_address
      tags
      approved_at
    }
  }
`;

export const PUBLIC_VENUES = gql`
  query PublicVenues {
    publicVenues {
      id
      owner_user_id
      venue_name
      venue_type
      capacity
      description
      cover_image_url
      country
      city
      state
      locality
      postal_code
      amenities
      tags
    }
  }
`;

export const FOLLOW_USER = gql`
  mutation FollowUser($user_id: ID!) {
    followUser(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($user_id: ID!) {
    unfollowUser(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`;

/** Withdraw a pending ask to follow a private profile — what tapping the
 * "Requested" button does. There is no edge yet, so unfollow would be a no-op. */
export const CANCEL_FOLLOW_REQUEST = gql`
  mutation CancelFollowRequest($user_id: ID!) {
    cancelFollowRequest(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`;

export const ANSWER_FOLLOW_REQUEST = gql`
  mutation AcceptFollowRequest($request_id: ID!) {
    acceptFollowRequest(request_id: $request_id) {
      user_id
      following_user_ids
    }
  }
`;

export const REJECT_FOLLOW_REQUEST = gql`
  mutation RejectFollowRequest($request_id: ID!) {
    rejectFollowRequest(request_id: $request_id) {
      user_id
    }
  }
`;
