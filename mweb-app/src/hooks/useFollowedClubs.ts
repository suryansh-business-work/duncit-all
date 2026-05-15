import { gql, useMutation, useQuery } from '@apollo/client';
import { useCallback, useMemo } from 'react';

const FOLLOWED_CLUBS = gql`
  query FollowedClubIds {
    me {
      user_id
      following_club_ids
    }
  }
`;

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

interface FollowedClubIdsData {
  me?: {
    user_id: string;
    following_club_ids: string[];
  } | null;
}

export function useFollowedClubs() {
  const { data, loading } = useQuery<FollowedClubIdsData>(FOLLOWED_CLUBS, {
    fetchPolicy: 'cache-and-network',
  });
  const refetchQueries = [{ query: FOLLOWED_CLUBS }];
  const [followClub, followState] = useMutation(FOLLOW_CLUB, {
    awaitRefetchQueries: true,
    refetchQueries,
  });
  const [unfollowClub, unfollowState] = useMutation(UNFOLLOW_CLUB, {
    awaitRefetchQueries: true,
    refetchQueries,
  });

  const ids = useMemo(() => data?.me?.following_club_ids ?? [], [data?.me?.following_club_ids]);

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
