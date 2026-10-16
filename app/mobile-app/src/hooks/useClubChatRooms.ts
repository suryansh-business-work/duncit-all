import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ClubChatRoomsDocument } from '@/graphql/chat';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type ClubChatRoom = ResultOf<typeof ClubChatRoomsDocument>['myClubChatRooms'][number];

/** The club rooms the user can open — joined clubs, plus the ones they run.
 * Only fetched while the Clubs tab is showing (`enabled`). */
export function useClubChatRooms(enabled: boolean) {
  const [rooms, setRooms] = useState<ClubChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    graphqlRequest(ClubChatRoomsDocument, {}, { auth: true })
      .then((data) => active && setRooms(data.myClubChatRooms))
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load club chats.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [enabled, attempt]);

  useRefreshRegistration(refetch);

  return { rooms, isLoading, error };
}
