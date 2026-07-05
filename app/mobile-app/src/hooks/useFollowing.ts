import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { FollowingPeopleDocument } from '@/graphql/following';
import { graphqlRequest } from '@/services/graphql.client';
import { useFollowingStore, type FollowingData } from '@/stores/following.store';

export type FollowedPerson = ResultOf<typeof FollowingPeopleDocument>['publicUsersByIds'][number];
export type FollowedClub = NonNullable<FollowingData['clubs']>[number];

/** Loads the people and clubs the signed-in user follows so the Following tab
 * mirrors mWeb's FollowPage (People / Clubs). */
export function useFollowing() {
  const data = useFollowingStore((s) => s.data);
  const isLoading = useFollowingStore((s) => s.isLoading);
  const fetch = useFollowingStore((s) => s.fetch);
  const [people, setPeople] = useState<FollowedPerson[]>([]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const followedUserIds = useMemo(
    () => data?.me?.following_user_ids ?? [],
    [data?.me?.following_user_ids],
  );
  const followedClubIds = useMemo(
    () => new Set(data?.me?.following_club_ids ?? []),
    [data?.me?.following_club_ids],
  );

  // Resolve the followed people's public profiles (skip when none).
  useEffect(() => {
    if (followedUserIds.length === 0) {
      setPeople([]);
      return;
    }
    let active = true;
    graphqlRequest(FollowingPeopleDocument, { ids: followedUserIds }, { auth: true })
      .then((d) => active && setPeople(d.publicUsersByIds))
      .catch(() => active && setPeople([]));
    return () => {
      active = false;
    };
  }, [followedUserIds]);

  const followedClubs = useMemo(
    () => (data?.clubs ?? []).filter((club) => followedClubIds.has(club.id)),
    [data?.clubs, followedClubIds],
  );

  return {
    people,
    followedClubs,
    isLoading,
    refetch: () => fetch(true),
  };
}
