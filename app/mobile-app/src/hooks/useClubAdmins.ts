import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ClubAdminsDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';

type ClubAdminsResult = NonNullable<ResultOf<typeof ClubAdminsDocument>['club']>;
export type ClubAdmin = ClubAdminsResult['club_admins'][number];

/** The people who administer a club, loaded on demand. Passing null keeps the
 * hook idle, so a closed sheet costs nothing. RN twin of mWeb's
 * PodClubAdminDialog query (rule 27). */
export function useClubAdmins(clubId: string | null) {
  const [admins, setAdmins] = useState<ClubAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // A closed sheet keeps what it had so it can fade out on the content the
    // host was reading; opening on another club clears it before the request,
    // so the previous club's admins are never shown under this pod's name.
    if (!clubId) return;
    let active = true;
    setAdmins([]);
    setIsLoading(true);
    setHasError(false);
    graphqlRequest(ClubAdminsDocument, { club_doc_id: clubId })
      .then((d) => active && setAdmins(d.club?.club_admins ?? []))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [clubId]);

  return { admins, isLoading, hasError };
}
