import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodSettlementPreviewDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';

export type PodSettlement = ResultOf<typeof PodSettlementPreviewDocument>['podSettlementPreview'];

/** Debounced live preview of the reconciled host/venue split for a pod, given
 * the venue's final bill the host is typing and the extra charges on it. The
 * extra charges always go (0 included) and the old slot-price choice never
 * does: the venue is paid the agreed amount plus them, and the bill is the
 * proof. Used by the Complete Pod dialog. The server's error message is
 * surfaced — a swallowed error rendered as a silent blank is exactly how "the
 * calculation doesn't appear". mWeb twin: @duncit/host-pod-actions SettlementPreview. */
export function useSettlementPreview(
  podId: string | null,
  venueBillAmount: number,
  /** Charges on the bill beyond the agreed amount, as the server takes them (`venueExtraAmountOf`). */
  venueExtraAmount: number,
  /** The venue's usage typed so far — it prices the slot. Absent = not entered. */
  venuePax?: number,
  overtimeHours?: number,
) {
  const [settlement, setSettlement] = useState<PodSettlement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!podId) return undefined;
    let active = true;
    setIsLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        PodSettlementPreviewDocument,
        {
          pod_id: podId,
          venue_bill_amount: venueBillAmount,
          venue_extra_amount: venueExtraAmount,
          venue_pax: venuePax,
          overtime_hours: overtimeHours,
        },
        { auth: true },
      )
        .then((res) => {
          if (active) {
            setSettlement(res.podSettlementPreview);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setSettlement(null);
            setError(err instanceof Error ? err.message : 'Could not load the settlement preview');
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [podId, venueBillAmount, venueExtraAmount, venuePax, overtimeHours]);

  return { settlement, isLoading, error };
}
