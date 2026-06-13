import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodSettlementPreviewDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';

export type PodSettlement = ResultOf<typeof PodSettlementPreviewDocument>['podSettlementPreview'];

/** Debounced live preview of the reconciled host/venue split for a pod, given
 * the venue bill the host is typing. Used by the Complete Pod dialog. */
export function useSettlementPreview(podId: string | null, venueBillAmount: number) {
  const [settlement, setSettlement] = useState<PodSettlement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!podId) return undefined;
    let active = true;
    setIsLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        PodSettlementPreviewDocument,
        { pod_id: podId, venue_bill_amount: venueBillAmount },
        { auth: true },
      )
        .then((res) => {
          if (active) setSettlement(res.podSettlementPreview);
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [podId, venueBillAmount]);

  return { settlement, isLoading };
}
