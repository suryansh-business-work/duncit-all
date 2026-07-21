import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { format } from 'date-fns';
import type { NavigateFunction } from 'react-router-dom';
import {
  BACKOUT,
  CANCEL_BACKOUT,
  INC_HITS,
  JOIN_FREE,
  REDEEM,
  TOGGLE_SAVED_POD_DETAIL,
} from './queries';
import { podUrl } from '../../utils/seoUrls';

/** Date/time + venue lines for a pod share so recipients get full context. */
export function buildPodShareText(pod: any): string {
  if (!pod) return '';
  const lines: string[] = [];
  if (pod.pod_date_time) {
    const date = new Date(pod.pod_date_time);
    if (!Number.isNaN(date.getTime())) lines.push(`When: ${format(date, "EEE, d MMM yyyy 'at' HH:mm")}`);
  }
  const where = [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');
  if (where) lines.push(`Where: ${where}`);
  return lines.join('\n');
}

interface Args {
  id: string;
  pod: any;
  saved: boolean;
  savedIds: string[];
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
  referralFromUrl,
  selectedProducts,
  refetch,
  navigate,
}: Args) {
  const [incHits] = useMutation(INC_HITS);
  const [joinFree, joinState] = useMutation(JOIN_FREE);
  const [backout, backoutState] = useMutation(BACKOUT);
  const [cancelBackout, cancelBackoutState] = useMutation(CANCEL_BACKOUT);
  const [redeem] = useMutation(REDEEM);
  const [toggleSavedPod] = useMutation(TOGGLE_SAVED_POD_DETAIL);
  const [snack, setSnack] = useState<string | null>(null);
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [keepSpotOpen, setKeepSpotOpen] = useState(false);
  const [keepSpotError, setKeepSpotError] = useState<string | null>(null);
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

  const onShare = async () => {
    const url = globalThis.window.location.href;
    const title = pod?.pod_title ?? 'Duncit Pod';
    const text = buildPodShareText(pod);
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText([title, text, url].filter(Boolean).join('\n'));
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
    // Variant lines carry their own price; base lines fall back to the pod row.
    const selectedTotal = selectedProducts.reduce(
      (sum, item: any) =>
        sum + Number(item.unit_cost ?? byId.get(item.product_id)?.unit_cost ?? 0) * item.quantity,
      0,
    );
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
    const url = `${globalThis.window.location.origin}${podUrl(pod.club_slug, pod.pod_id)}?ref=${token}`;
    navigator.clipboard?.writeText(url);
    setSnack('Referral link copied');
  };

  const onConfirmBackout = async () => {
    if (!pod) return;
    try {
      await backout({ variables: { id: pod.id } });
      setBackoutOpen(false);
      setSnack('Backout in process — your seat is now open for booking.');
      await refetch();
    } catch (e: any) {
      setBackoutOpen(false);
      setSnack(e.message);
    }
  };

  // "Keep My Spot" — cancel the in-process backout and restore the booking.
  // A server refusal (replacement already confirmed) stays inside the dialog.
  const onConfirmKeepSpot = async () => {
    if (!pod) return;
    setKeepSpotError(null);
    try {
      await cancelBackout({ variables: { id: pod.id } });
      setKeepSpotOpen(false);
      setSnack('Your booking is restored.');
      await refetch();
    } catch (e: any) {
      setKeepSpotError(e.message);
      await refetch();
    }
  };

  const openKeepSpot = () => {
    setKeepSpotError(null);
    setKeepSpotOpen(true);
  };

  return {
    backoutOpen,
    backoutState,
    keepSpotOpen,
    keepSpotError,
    cancelBackoutState,
    setKeepSpotOpen,
    openKeepSpot,
    onConfirmKeepSpot,
    displaySaved: localSaved ?? saved,
    joinState,
    savePending,
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
    onToggleSave,
  };
}