import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useCallback, useMemo } from 'react';
import { useUserInfo } from '../user-info/useUserInfo';

const FOLLOW_CLUB = gql`
  mutation FollowClub($club_id: ID!) {
    followClub(club_id: $club_id) {
      user_id
      following_club_ids
    }
  }
`;

const UNFOLLOW_CLUB = gql`
  mutation UnfollowClub($club_id: ID!) {
    unfollowClub(club_id: $club_id) {
      user_id
      following_club_ids
    }
  }
`;

export function useFollowedClubs() {
  // The followed clubs ride in USER_INFO, already in the cache.
  const { me, loading } = useUserInfo();
  // Both mutations answer with the viewer's User (user_id + following_club_ids),
  // which Apollo writes straight onto the same cache entry `me` points at — so
  // the button flips on the mutation's own answer. An awaited refetch of `me`
  // on top of that doubled every follow's wait for nothing.
  const [followClub, followState] = useMutation<any>(FOLLOW_CLUB);
  const [unfollowClub, unfollowState] = useMutation<any>(UNFOLLOW_CLUB);

  const ids = useMemo(() => me?.following_club_ids ?? [], [me?.following_club_ids]);

  const isFollowing = useCallback((clubId: string) => ids.includes(clubId), [ids]);

  const follow = useCallback(
    async (clubId: string) => {
      await followClub({ variables: { club_id: clubId } });
    },
    [followClub]
  );

  const unfollow = useCallback(
    async (clubId: string) => {
      await unfollowClub({ variables: { club_id: clubId } });
    },
    [unfollowClub]
  );

  const toggle = useCallback(
    async (clubId: string) => {
      const nextFollowing = !isFollowing(clubId);
      if (nextFollowing) await follow(clubId);
      else await unfollow(clubId);
      return nextFollowing;
    },
    [follow, isFollowing, unfollow]
  );

  return {
    ids,
    isFollowing,
    follow,
    unfollow,
    toggle,
    loading: loading || followState.loading || unfollowState.loading,
  };
}
