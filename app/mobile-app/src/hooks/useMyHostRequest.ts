import { useCallback, useEffect, useState } from 'react';

import { MyHostRequestDocument, type MyHostRequest } from '@/graphql/host-request';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Loads the signed-in host's latest ACTIVE (REQUESTED|ACKNOWLEDGED) host request,
 * or null when none is pending. Drives the Host Studio banner's Apply-Now /
 * Applied lock; `refetch` re-runs it on screen focus after a submission.
 */
export function useMyHostRequest() {
  const [request, setRequest] = useState<MyHostRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(() => {
    setIsLoading(true);
    return graphqlRequest(MyHostRequestDocument, undefined, { auth: true })
      .then((res) => setRequest(res.myHostRequest ?? null))
      .catch(() => setRequest(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { request, isLoading, refetch };
}
