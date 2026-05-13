import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import type { NavigateFunction } from 'react-router-dom';
import {
  BACKOUT,
  INC_HITS,
  JOIN_FREE,
  REDEEM,
  TOGGLE_SAVED_POD_DETAIL,
} from './queries';
import { podUrl } from '../../utils/seoUrls';

interface Args {
  id: string;
  pod: any;
  saved: boolean;
  savedIds: string[];
  referralFromUrl: string | null;
  refetch: () => Promise<unknown>;
  navigate: NavigateFunction;
}

export function usePodDetailActions({
  id,
  pod,
  saved,
  savedIds,
  referralFromUrl,
  refetch,
  navigate,
}: Args) {
  const [incHits] = useMutation(INC_HITS);
  const [joinFree, joinState] = useMutation(JOIN_FREE);
  const [backout, backoutState] = useMutation(BACKOUT);
  const [redeem] = useMutation(REDEEM);
  const [toggleSavedPod] = useMutation(TOGGLE_SAVED_POD_DETAIL);
  const [snack, setSnack] = useState<string | null>(null);
  const [backoutOpen, setBackoutOpen] = useState(false);

  useEffect(() => {
    if (id) incHits({ variables: { id } }).catch(() => {});
  }, [id, incHits]);

  useEffect(() => {
    if (!referralFromUrl || !id) return;
    redeem({ variables: { token: referralFromUrl } })
      .then(() => {
        setSnack('Joined via referral');
        refetch();
      })
      .catch((e) => setSnack(e.message));
  }, [referralFromUrl, id, redeem, refetch]);

  const onToggleSave = async () => {
    if (!pod) return;
    try {
      await toggleSavedPod({
        variables: { pod_doc_id: pod.id },
        optimisticResponse: {
          toggleSavedPod: {
            __typename: 'SavedPodState',
            pod_id: pod.id,
            saved: !saved,
            saved_pod_ids: saved ? savedIds.filter((x) => x !== pod.id) : [...savedIds, pod.id],
          },
        },
      });
    } catch (e: any) {
      setSnack(e.message);
    }
  };

  const onShare = async () => {
    const url = window.location.href;
    const title = pod?.pod_title ?? 'Duncit Pod';
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setSnack('Link copied');
      }
    } catch {
      // user cancelled native share sheet
    }
  };

  const onJoinFree = async () => {
    if (!pod) return;
    try {
      await joinFree({ variables: { id: pod.id, referral: referralFromUrl } });
      setSnack('Joined!');
      await refetch();
    } catch (e: any) {
      setSnack(e.message);
    }
  };

  const onPaidCheckout = () => {
    if (!pod) return;
    const params = new URLSearchParams({
      title: pod.pod_title || '',
      amount: String(Number(pod.pod_amount) || 0),
    });
    navigate(`/checkout/${pod.id}?${params.toString()}`, {
      state: {
        pod_id: pod.id,
        pod_title: pod.pod_title,
        amount: Number(pod.pod_amount) || 0,
        description: `Pod booking · ${pod.pod_title}`,
      },
    });
  };

  const onCopyReferral = (token: string) => {
    if (!pod) return;
    const url = `${window.location.origin}${podUrl(pod.club_slug, pod.pod_id)}?ref=${token}`;
    navigator.clipboard?.writeText(url);
    setSnack('Referral link copied');
  };

  const onConfirmBackout = async () => {
    if (!pod) return;
    try {
      await backout({ variables: { id: pod.id } });
      setBackoutOpen(false);
      setSnack('You have backed out.');
      await refetch();
    } catch (e: any) {
      setBackoutOpen(false);
      setSnack(e.message);
    }
  };

  return {
    backoutOpen,
    backoutState,
    joinState,
    snack,
    setBackoutOpen,
    setSnack,
    onConfirmBackout,
    onCopyReferral,
    onJoinFree,
    onPaidCheckout,
    onShare,
    onToggleSave,
  };
}