import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { COMPLETE_POD_SETTLEMENT } from './queries';
import { buildCompleteInput, type CompletePodValues } from './complete-pod-dialog';

interface Args {
  refetch: () => Promise<any>;
  setToast: (message: string) => void;
}

export default function usePodReleaseRequest({ refetch, setToast }: Args) {
  const [completePodSettlement] = useMutation(COMPLETE_POD_SETTLEMENT);
  const [completePod, setCompletePod] = useState<any | null>(null);
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const submitComplete = async (values: CompletePodValues) => {
    if (!completePod) return;
    setReleaseBusy(true);
    setReleaseError(null);
    try {
      await completePodSettlement({ variables: { input: buildCompleteInput(values, completePod.id) } });
      setToast('Pod completion submitted for approval');
      setCompletePod(null);
      await refetch();
    } catch (e: any) {
      setReleaseError(e.message);
    } finally {
      setReleaseBusy(false);
    }
  };

  const openCompletePod = (pod: any) => {
    setCompletePod(pod);
    setReleaseError(null);
  };

  return { completePod, releaseBusy, releaseError, submitComplete, openCompletePod, setCompletePod };
}
