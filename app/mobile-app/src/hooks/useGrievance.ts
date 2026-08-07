import { useEffect, useState } from 'react';
import type { GrievanceDraft, PublicGrievanceOfficer, SubmittedGrievance } from '@duncit/utils';

import { GrievanceOfficerDocument, SubmitGrievanceDocument } from '@/graphql/grievance';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Raise a grievance.
 *
 * Sent with `auth: true` so a signed-in complaint is traceable to the account,
 * but the mutation itself does not require one — the server records whoever it
 * can and accepts the grievance either way.
 */
export async function submitGrievance(values: GrievanceDraft): Promise<SubmittedGrievance> {
  const res = await graphqlRequest<
    { submitGrievance: SubmittedGrievance },
    { input: GrievanceDraft & { source: string } }
  >(SubmitGrievanceDocument, { input: { ...values, source: 'APP' } }, { auth: true });
  return res.submitGrievance;
}

/** The published officer. Undefined until it loads, blank fields until Legal fills them in. */
export function useGrievanceOfficer(): PublicGrievanceOfficer | undefined {
  const [officer, setOfficer] = useState<PublicGrievanceOfficer | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    graphqlRequest<{ grievanceOfficer: PublicGrievanceOfficer }>(GrievanceOfficerDocument)
      .then((res) => {
        if (alive) setOfficer(res.grievanceOfficer);
      })
      // The form still works without the card; a failed read must not block it.
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return officer;
}
