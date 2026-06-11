import { gql } from '@/generated/graphql';

/** The ids the signed-in user follows — used to filter the home feed into the
 * Following tab (followed pods today; followed people/posts are a follow-up). */
export const FollowingDocument = gql(`
  query MobileFollowing {
    me {
      user_id
      following_pod_ids
      following_user_ids
    }
  }
`);
