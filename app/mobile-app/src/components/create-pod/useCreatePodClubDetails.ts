import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { CreatePodClubDetailsDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';

export type CreatePodClubDetails = NonNullable<
  ResultOf<typeof CreatePodClubDetailsDocument>['club']
>;

/** The selected club's rating, chats and admin contacts, loaded only while the
 * details sheet is open (null keeps it idle). Same on-demand shape as useClubAdmins. */
export function useCreatePodClubDetails(clubId: string | null) {
  const [details, setDetails] = useState<CreatePodClubDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    let active = true;
    setDetails(null);
    setIsLoading(true);
    setHasError(false);
    graphqlRequest(CreatePodClubDetailsDocument, { club_doc_id: clubId })
      .then((d) => active && setDetails(d.club ?? null))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [clubId]);

  return { details, isLoading, hasError };
}
