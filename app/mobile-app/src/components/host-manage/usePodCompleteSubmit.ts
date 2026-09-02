import { useCallback, useState } from 'react';

import { CompletePodSettlementDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';
import {
  buildCompleteInput,
  type HostPodForComplete,
  type PodCompleteValues,
} from './pod-complete.form';

/**
 * Sending a pod's completion, and the two pieces of state only the send owns.
 *
 * Split out of PodCompleteDialog so the dialog stays under the
 * cognitive-complexity limit (S3776): the guard, the try/catch and the choice
 * of error sentence were five of its branches, and none of them is about what
 * the dialog renders.
 *
 * The failure sentence is passed in rather than translated here so the hook
 * holds no copy of its own — the dialog already has the bundle open.
 */
export function usePodCompleteSubmit(
  pod: HostPodForComplete | null,
  onCompleted: () => void,
  failureMessage: string,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (values: PodCompleteValues) => {
      /* istanbul ignore next -- the dialog only mounts with a pod */
      if (!pod) return;
      setBusy(true);
      setError(null);
      try {
        await graphqlRequest(
          CompletePodSettlementDocument,
          { input: buildCompleteInput(values, pod.id) },
          { auth: true },
        );
        onCompleted();
      } catch (err) {
        setError(err instanceof Error ? err.message : failureMessage);
      } finally {
        setBusy(false);
      }
    },
    [pod, onCompleted, failureMessage],
  );

  return { busy, error, run };
}
