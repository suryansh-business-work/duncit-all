import { useEffect, useState } from 'react';

import { PodSpotLimitsDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import type { PodSpotLimits } from './pod-edit.form';

/**
 * How big this pod may be resized to, read when the edit sheet opens.
 *
 * The ceiling is the capacity of the venue space the pod booked, and once that
 * slot is BOOKED no list the app can read still carries it — so the range comes
 * from the server, which guards the write with the same rules.
 * mWeb twin: the POD_SPOT_LIMITS query in @duncit/host-pod-actions (rule 27).
 */
export function usePodSpotLimits(podId: string | undefined) {
  const [limits, setLimits] = useState<PodSpotLimits | null>(null);

  useEffect(() => {
    setLimits(null);
    if (!podId) return;
    let active = true;
    graphqlRequest(PodSpotLimitsDocument, { pod_doc_id: podId }, { auth: true })
      .then((res) => active && setLimits(res.podSpotLimits))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [podId]);

  return limits;
}
