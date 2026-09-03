import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { UpdateClubInput } from '@/generated/graphql/graphql';
import { ClubAdminClubDocument, ClubAdminUpdateClubDocument } from '@/graphql/club-admin';
import { graphqlRequest } from '@/services/graphql.client';

export type EditableClub = NonNullable<ResultOf<typeof ClubAdminClubDocument>['club']>;

/**
 * One club the admin edits: the record the form prefills from, and the save
 * that writes it back through `clubAdminUpdateClub` — the server ignores the
 * governance fields, so the form never sends them.
 */
export function useClubEdit(clubId: string) {
  const [club, setClub] = useState<EditableClub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    graphqlRequest(ClubAdminClubDocument, { club_doc_id: clubId }, { auth: true })
      .then((res) => active && setClub(res.club ?? null))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [clubId, attempt]);

  const save = async (input: UpdateClubInput) => {
    await graphqlRequest(
      ClubAdminUpdateClubDocument,
      { club_doc_id: clubId, input },
      { auth: true },
    );
  };

  return {
    club,
    isLoading,
    hasError,
    notFound: !isLoading && !hasError && !club,
    refetch: () => setAttempt((value) => value + 1),
    save,
  };
}
