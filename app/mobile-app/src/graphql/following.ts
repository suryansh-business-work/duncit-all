import { gql } from '@/generated/graphql';

/** The ids the signed-in user follows + the followed clubs, so the Following tab
 * can show Pods, Clubs and People (parity with mWeb's FollowPage). */
export const FollowingDocument = gql(`
  query MobileFollowing {
    me {
      user_id
      following_pod_ids
      following_club_ids
      following_user_ids
    }
    clubs(filter: { is_active: true }) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
    }
  }
`);

/** The public profiles of the people the viewer follows — mWeb's FOLLOWED_USERS. */
export const FollowingPeopleDocument = gql(`
  query MobileFollowingPeople($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      first_name
      profile_photo
    }
  }
`);

/** Follow/unfollow a pod — returns the viewer's updated followed-pod ids. */
export const FollowPodDocument = gql(`
  mutation MobileFollowPod($podId: ID!) {
    followPod(pod_id: $podId) {
      user_id
      following_pod_ids
    }
  }
`);

export const UnfollowPodDocument = gql(`
  mutation MobileUnfollowPod($podId: ID!) {
    unfollowPod(pod_id: $podId) {
      user_id
      following_pod_ids
    }
  }
`);

/** Follow/unfollow a club — returns the viewer's updated followed-club ids. */
export const FollowClubDocument = gql(`
  mutation MobileFollowClub($clubId: ID!) {
    followClub(club_id: $clubId) {
      user_id
      following_club_ids
    }
  }
`);

export const UnfollowClubDocument = gql(`
  mutation MobileUnfollowClub($clubId: ID!) {
    unfollowClub(club_id: $clubId) {
      user_id
      following_club_ids
    }
  }
`);
