import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import type { NavigateFunction } from 'react-router-dom';
import {
  BACKOUT,
  FOLLOW_POD,
  INC_HITS,
  JOIN_FREE,
  REDEEM,
  TOGGLE_SAVED_POD_DETAIL,
  UNFOLLOW_POD,
} from './queries';
import { podUrl } from '../../utils/seoUrls';

interface Args {
  id: string;
  pod: any;
  saved: boolean;
  savedIds: string[];
  following: boolean;
  followingIds: string[];
  referralFromUrl: string | null;
  selectedProducts: Array<{ product_id: string; quantity: number }>;
  refetch: () => Promise<unknown>;
  navigate: NavigateFunction;
}

export function usePodDetailActions({
  id,
  pod,
  saved,
  savedIds,
  following,
  followingIds,
  referralFromUrl,
  selectedProducts,
  refetch,
  navigate,
}: Args) {
  const [incHits] = useMutation(INC_HITS);
  const [joinFree, joinState] = useMutation(JOIN_FREE);
  const [backout, backoutState] = useMutation(BACKOUT);
  const [redeem] = useMutation(REDEEM);
  const [toggleSavedPod] = useMutation(TOGGLE_SAVED_POD_DETAIL);
  const [followPod, followState] = useMutation(FOLLOW_POD);
  const [unfollowPod, unfollowState] = useMutation(UNFOLLOW_POD);
  const [snack, setSnack] = useState<string | null>(null);
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [confettiOpen, setConfettiOpen] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [localSaved, setLocalSaved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!savePending) setLocalSaved(null);
  }, [saved, savePending]);

  useEffect(() => {
    if (id) incHits({ variables: { id } }).catch(() => {});
  }, [id, incHits]);

  useEffect(() => {
    if (!referralFromUrl || !id) return;
    redeem({ variables: { token: referralFromUrl } })
      .then(() => {
        setSnack('Joined via referral');
        setConfettiOpen(true);
        refetch();
      })
      .catch((e) => setSnack(e.message));
  }, [referralFromUrl, id, redeem, refetch]);

  const onToggleSave = async () => {
    if (!pod) return;
    const nextSaved = !(localSaved ?? saved);
    setLocalSaved(nextSaved);
    setSavePending(true);
    try {
      await toggleSavedPod({
        variables: { pod_doc_id: pod.id },
        optimisticResponse: {
          toggleSavedPod: {
            __typename: 'SavedPodState',
            pod_id: pod.id,
            saved: nextSaved,
            saved_pod_ids: nextSaved ? [...savedIds, pod.id] : savedIds.filter((x) => x !== pod.id),
          },
        },
      });
    } catch (e: any) {
      setLocalSaved(saved);
      setSnack(e.message);
    } finally {
      setSavePending(false);
    }
  };

  const onToggleFollow = async () => {
    if (!pod) return;
    try {
      const mutation = following ? unfollowPod : followPod;
      await mutation({
        variables: { pod_id: pod.id },
        optimisticResponse: {
          [following ? 'unfollowPod' : 'followPod']: {
            __typename: 'User',
            user_id: 'me',
            following_pod_ids: following
              ? followingIds.filter((x) => x !== pod.id)
              : [...followingIds, pod.id],
          },
        },
      });
      setSnack(following ? 'Pod unfollowed' : 'Pod followed');
      await refetch();
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
      setConfettiOpen(true);
      setSnack('Joined!');
      await refetch();
    } catch (e: any) {
      setSnack(e.message);
    }
  };

  const onPaidCheckout = () => {
    if (!pod) return;
    const byId = new Map<string, any>((pod.product_requests ?? []).map((item: any) => [item.product_id, item]));
    const selectedTotal = selectedProducts.reduce((sum, item) => sum + Number(byId.get(item.product_id)?.unit_cost ?? 0) * item.quantity, 0);
    const amount = Number(pod.pod_amount) + selectedTotal;
    const params = new URLSearchParams({
      title: pod.pod_title || '',
      amount: String(amount || 0),
    });
    navigate(`/checkout/${pod.id}?${params.toString()}`, {
      state: {
        pod_id: pod.id,
        pod_title: pod.pod_title,
        amount,
        selected_products: selectedProducts,
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
    displaySaved: localSaved ?? saved,
    joinState,
    savePending,
    followState,
    unfollowState,
    snack,
    confettiOpen,
    setConfettiOpen,
    setBackoutOpen,
    setSnack,
    onConfirmBackout,
    onCopyReferral,
    onJoinFree,
    onPaidCheckout,
    onShare,
    onToggleFollow,
    onToggleSave,
  };
}