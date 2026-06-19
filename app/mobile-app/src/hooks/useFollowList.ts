import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { FollowersOfDocument, FollowingOfDocument } from '@/graphql/following';
import { MobileFollowUserDocument, MobileUnfollowUserDocument } from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';

export type FollowListPerson = ResultOf<typeof FollowersOfDocument>['followersOf'][number];
export type FollowTab = 'followers' | 'following';

/**
 * Loads a profile's followers or following list (bug 9) and toggles the viewer's
 * own follow state on each row, optimistically flipping the button.
 */
export function useFollowList(userId: string, tab: FollowTab) {
  const [people, setPeople] = useState<FollowListPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (tab === 'followers') {
        const data = await graphqlRequest(FollowersOfDocument, { userId }, { auth: true });
        setPeople(data.followersOf);
      } else {
        const data = await graphqlRequest(FollowingOfDocument, { userId }, { auth: true });
        setPeople(data.followingOf);
      }
    } catch {
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(async (target: FollowListPerson) => {
    setBusyId(target.user_id);
    try {
      const doc = target.is_following ? MobileUnfollowUserDocument : MobileFollowUserDocument;
      await graphqlRequest(doc, { user_id: target.user_id }, { auth: true });
      setPeople((prev) =>
        prev.map((person) =>
          person.user_id === target.user_id
            ? { ...person, is_following: !person.is_following }
            : person,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  return { people, isLoading, busyId, toggle, refetch: load };
}
