import { followStatusFrom, type FollowAction, type FollowStatus } from '@duncit/utils';

import {
  MobileCancelFollowRequestDocument,
  MobileFollowUserDocument,
  MobileUnfollowUserDocument,
} from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';

/** The viewer's own lists as every follow mutation returns them. */
interface FollowLists {
  following_user_ids?: readonly string[] | null;
  requested_user_ids?: readonly string[] | null;
}

async function send(action: FollowAction, userId: string): Promise<FollowLists> {
  const variables = { user_id: userId };
  if (action === 'UNFOLLOW') {
    const res = await graphqlRequest(MobileUnfollowUserDocument, variables, { auth: true });
    return res.unfollowUser;
  }
  if (action === 'CANCEL_REQUEST') {
    const res = await graphqlRequest(MobileCancelFollowRequestDocument, variables, { auth: true });
    return res.cancelFollowRequest;
  }
  const res = await graphqlRequest(MobileFollowUserDocument, variables, { auth: true });
  return res.followUser;
}

/**
 * Run one follow action against a user and report the status the SERVER
 * settled on — the one place native turns a tap into a follow state, shared by
 * the profile screen, the follow lists and the hosts directory.
 *
 * Following a private profile lands on REQUESTED, not FOLLOWING: the edge is
 * only written when its owner accepts, so the button must believe the
 * response rather than the tap. The response carries both of the viewer's
 * lists, so the answer is read off them rather than guessed from privacy.
 */
export async function runUserFollowAction(
  action: FollowAction,
  userId: string,
): Promise<FollowStatus> {
  const me = await send(action, userId);
  return followStatusFrom(
    new Set(me.following_user_ids ?? []),
    new Set(me.requested_user_ids ?? []),
    userId,
  );
}
