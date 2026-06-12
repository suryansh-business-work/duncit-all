import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { DeletePodDraftDocument, MyPodDraftsDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';

export type HostDraft = ResultOf<typeof MyPodDraftsDocument>['myPodDrafts'][number];

/** Loads the signed-in host's resumable Create Pod drafts and supports deleting
 * one (optimistically removed from the list). */
export function useHostDrafts() {
  const [drafts, setDrafts] = useState<HostDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    graphqlRequest(MyPodDraftsDocument, undefined, { auth: true })
      .then((res) => active && setDrafts(res.myPodDrafts))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    await graphqlRequest(DeletePodDraftDocument, { draft_id: id }, { auth: true });
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  };

  return { drafts, isLoading, remove };
}
