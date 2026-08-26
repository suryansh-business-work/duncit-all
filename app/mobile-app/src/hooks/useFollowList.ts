import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { followActionFor, readFollowStatus } from '@duncit/utils';

import { FollowersOfDocument, FollowingOfDocument } from '@/graphql/following';
import { runUserFollowAction } from '@/services/follow-user';
import { graphqlRequest } from '@/services/graphql.client';

export type FollowListPerson = ResultOf<typeof FollowersOfDocument>['followersOf'][number];
export type FollowTab = 'followers' | 'following';

/**
 * Loads a profile's followers or following list (bug 9) and moves the viewer's
 * own follow state on each row — Follow / Follow Back / Requested / Following.
 *
 * The row is patched with the status the SERVER settled on, not the tap: a
 * private person in the list lands on Requested, and tapping that withdraws
 * the ask rather than unfollowing an edge that does not exist yet. Twin of
 * mWeb's FollowListDialog (rule 27).
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
    load();
  }, [load]);

  const toggle = useCallback(async (target: FollowListPerson) => {
    setBusyId(target.user_id);
    try {
      const settled = await runUserFollowAction(
        followActionFor(readFollowStatus(target)),
        target.user_id,
      );
      // The generated document types the field as the schema enum; the shared
      // helper answers with its string form. Same three values either way.
      const follow_status = settled as FollowListPerson['follow_status'];
      setPeople((prev) =>
        prev.map((person) =>
          person.user_id === target.user_id
            ? { ...person, follow_status, is_following: settled === 'FOLLOWING' }
            : person,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  return { people, isLoading, busyId, toggle, refetch: load };
}
