import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { DeletePodDraftDocument, MyPodDraftsDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type HostDraft = ResultOf<typeof MyPodDraftsDocument>['myPodDrafts'][number];

/** Loads the signed-in host's resumable Create Pod drafts and supports deleting
 * one (optimistically removed from the list). */
export function useHostDrafts() {
  const [drafts, setDrafts] = useState<HostDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    graphqlRequest(MyPodDraftsDocument, undefined, { auth: true })
      .then((res) => active && setDrafts(res.myPodDrafts))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  useRefreshRegistration(refetch);

  const remove = async (id: string) => {
    await graphqlRequest(DeletePodDraftDocument, { draft_id: id }, { auth: true });
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  };

  return { drafts, isLoading, remove };
}
