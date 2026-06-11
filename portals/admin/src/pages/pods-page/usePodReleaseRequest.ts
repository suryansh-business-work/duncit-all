import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_PAYMENT_RELEASE } from './queries';
import { mediaTextToInput, type HostReleaseValues, type VenueReleaseValues } from './complete-pod-dialog';

type ReleaseKind = 'VENUE_BILLING' | 'HOST_PAYMENT';

interface Args {
  refetch: () => Promise<any>;
  setToast: (message: string) => void;
}

export default function usePodReleaseRequest({ refetch, setToast }: Args) {
  const [createRelease] = useMutation(CREATE_PAYMENT_RELEASE);
  const [completePod, setCompletePod] = useState<any | null>(null);
  const [releaseBusy, setReleaseBusy] = useState<ReleaseKind | ''>('');
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const requestRelease = async (kind: ReleaseKind, values: VenueReleaseValues | HostReleaseValues) => {
    if (!completePod) return;
    setReleaseBusy(kind);
    setReleaseError(null);
    try {
      await createRelease({
        variables: {
          input: {
            pod_id: completePod.id,
            kind,
            amount_requested: Number(values.amount_requested),
            notes: values.notes,
            bill_url: kind === 'VENUE_BILLING' ? (values as VenueReleaseValues).bill_url : undefined,
            host_user_id: kind === 'HOST_PAYMENT' ? (values as HostReleaseValues).host_user_id : undefined,
            evidence_media: kind === 'HOST_PAYMENT' ? mediaTextToInput((values as HostReleaseValues).evidence_media_text) : [],
          },
        },
      });
      setToast('Payment release request created');
      await refetch();
    } catch (e: any) {
      setReleaseError(e.message);
    } finally {
      setReleaseBusy('');
    }
  };

  const openCompletePod = (pod: any) => {
    setCompletePod(pod);
    setReleaseError(null);
  };

  return { completePod, releaseBusy, releaseError, requestRelease, openCompletePod, setCompletePod };
}