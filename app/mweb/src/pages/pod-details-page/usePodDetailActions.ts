import { useEffect, useState } from 'react';

const round2 = (n: number) => Math.round(n * 100) / 100;
import { useMutation } from '@apollo/client';
import { formatDateTime } from '../../utils/dateFormat';
import { buildPodShareMessage, podMapLink, trackedPodShareLinks } from '@duncit/utils';
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
import { shareUrl } from '../../lib/share-link';
import { useTranslation } from '../../i18n/useTranslation';

/** The pod's date/time as this surface renders it, for the share message. In
 * the admin's configured patterns, so a shared pod reads the same whether the
 * link was copied from mWeb or the app (rule 27). */
function shareWhenText(pod: any): string | null {
  return formatDateTime(pod?.pod_date_time) || null;
}

/**
 * The full share message: title, when, venue + map link, pod link. Shape comes
 * from @duncit/utils so native shares the identical text (rule 27); only the
 * date formatting is this surface's own.
 */
export function buildPodShareText(pod: any, url: string, mapUrl?: string | null): string {
  if (!pod) return url;
  return buildPodShareMessage({
    title: pod.pod_title,
    whenText: shareWhenText(pod),
    venue: pod,
    url,
    mapUrl,
  });
}

/** The pod link and the venue map link, both tracked. The pairing lives in
 * @duncit/utils so the app resolves them exactly the same way (rule 27). */
const trackedPodLinks = (pod: any, pageUrl: string) =>
  trackedPodShareLinks(shareUrl, pod?.id ?? '', pageUrl, podMapLink(pod));

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
  const { t } = useTranslation();
  const [incHits] = useMutation(INC_HITS);
  const [joinFree, joinState] = useMutation(JOIN_FREE);
  const [backout, backoutState] = useMutation(BACKOUT);
  const [cancelBackout, cancelBackoutState] = useMutation(CANCEL_BACKOUT);
  const [redeem] = useMutation(REDEEM);
  const [toggleSavedPod] = useMutation(TOGGLE_SAVED_POD_DETAIL);
  // Seats the booking will take. Owned here because BOTH the free join and the
  // paid checkout need it, and the picker that sets it lives in the CTA row.
  const [seats, setSeats] = useState(1);
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
        setSnack(t('mweb.podDetails.joinedViaReferral'));
        setConfettiOpen(true);
        refetch();
      })
      .catch((e) => setSnack(e.message));
  }, [referralFromUrl, id, redeem, refetch, t]);

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
    const { url, mapUrl } = await trackedPodLinks(pod, globalThis.window.location.href);
    const title = pod?.pod_title ?? t('mweb.podDetails.duncitPod');
    const text = buildPodShareText(pod, url, mapUrl);
    try {
      // Deliberately NO `url` field. The Web Share API lets a target choose what
      // it takes, and the common ones (iOS Safari's sheet, WhatsApp) prefer
      // `url` and drop `text` entirely when both are set — which is exactly how
      // a share carrying title, time and map link arrived as a bare link. The
      // URL is the last line of `text`, so every target gets all four parts.
      if (navigator.share) await navigator.share({ title, text });
      else {
        await navigator.clipboard.writeText(text);
        setSnack(t('mweb.podDetails.linkCopied'));
      }
    } catch {
      // user cancelled native share sheet
    }
  };

  const onJoinFree = async () => {
    if (!pod) return;
    try {
      await joinFree({ variables: { id: pod.id, referral: referralFromUrl, seats } });
      setConfettiOpen(true);
      setSnack(t('mweb.podDetails.joinedSnack'));
      await refetch();
    } catch (e: any) {
      setSnack(e.message);
    }
  };

  // Book & Pay charges the pod membership (pod_amount) ONLY — products are bought
  // separately through the standalone product checkout, never mixed in one payment.
  const onPaidCheckout = () => {
    if (!pod) return;
    // The seat count travels with the checkout; the server re-prices and
    // re-checks capacity, so this amount is a preview, never the charge.
    const amount = round2((Number(pod.pod_amount) || 0) * seats);
    const params = new URLSearchParams({
      title: pod.pod_title || '',
      amount: String(amount),
      seats: String(seats),
    });
    navigate(`/checkout/${pod.id}?${params.toString()}`, {
      state: {
        pod_id: pod.id,
        pod_title: pod.pod_title,
        amount,
        seats,
        description: `Pod booking · ${pod.pod_title}`,
      },
    });
  };

  const onCopyReferral = (token: string) => {
    if (!pod) return;
    const url = `${globalThis.window.location.origin}${podUrl(pod.club_slug, pod.pod_id)}?ref=${token}`;
    navigator.clipboard?.writeText(url);
    setSnack(t('mweb.podDetails.referralLinkCopied'));
  };

  // `seats` releases part of a multi-seat booking; omitting it releases all of
  // it, which is what a single-seat booking always does.
  const onConfirmBackout = async (seats?: number) => {
    if (!pod) return;
    try {
      await backout({ variables: { id: pod.id, seats: seats ?? null } });
      setBackoutOpen(false);
      setSnack(t('mweb.podDetails.backoutStarted'));
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
      setSnack(t('mweb.podDetails.bookingRestored'));
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
    seats,
    setSeats,
    onJoinFree,
    onPaidCheckout,
    onShare,
    onToggleSave,
  };
}