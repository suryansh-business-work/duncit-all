import { useState } from 'react';
import { Share } from 'react-native';

import type { PodDetail } from '@/hooks/useDetails';
import { useTranslation } from '@/hooks/useTranslation';
import { usePodBackout, usePodCancelBackout } from '@/hooks/usePodHistory';
import { toErrorMessage } from '@/utils/errors';
import { JoinFreePodDocument, JoinPodMeetingDocument } from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { podShareLinks } from '@/services/share-link';
import { podShareMessage } from '@/utils/pod-format';

/** Booking, backout and share actions for the loaded pod — the state the
 * booking bar and its dialogs share. RN twin of mWeb's usePodDetailActions. */
export function usePodDetailActions(pod: PodDetail | null, refetch: () => Promise<void>) {
  const { t } = useTranslation();
  const { backout, busy: backingOut } = usePodBackout();
  const { cancelBackout, busy: restoringSpot } = usePodCancelBackout();
  // Seats the booking will take — set by the picker in the bottom bar and
  // carried into Checkout, which re-prices the ticket by it.
  const [seats, setSeats] = useState(1);
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [keepSpotOpen, setKeepSpotOpen] = useState(false);
  const [keepSpotError, setKeepSpotError] = useState<string | null>(null);
  const [joiningFree, setJoiningFree] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  /**
   * A free pod is joined outright — no checkout.
   *
   * The server forces `pod_amount` to 0 on a FREE pod, so sending one through
   * the paid checkout asked it to charge nothing and got "Amount must be
   * greater than 0" back: free pods could not be joined from the app at all.
   * mWeb has always called `joinFreePod` here (rule 27).
   *
   * KNOWN GAP: mWeb also forwards the `?ref=` referral token from the URL. The
   * native PodDetails route has no referral param yet, so a free join from a
   * shared link does not credit the sharer — that needs deep-link plumbing and
   * is its own change.
   */
  const onJoinFree = async () => {
    if (!pod || joiningFree) return;
    setJoiningFree(true);
    setJoinError(null);
    try {
      await graphqlRequest(
        JoinFreePodDocument,
        { podId: pod.id, referral: null, seats },
        { auth: true },
      );
      await refetch();
    } catch (err) {
      setJoinError(toErrorMessage(err, t('mweb.podDetails.couldNotJoin')));
    } finally {
      setJoiningFree(false);
    }
  };

  /**
   * A virtual pod's meeting link, asked for through `joinPodMeeting` rather
   * than read off `pod.meeting_url`: inside the pod window that call marks the
   * booking present as VIRTUAL_JOIN, which is what a virtual host is paid on.
   * A host opening their own link is handed it and marks nothing. mWeb twin.
   */
  const onJoinMeeting = async (podId: string) => {
    const res = await graphqlRequest(JoinPodMeetingDocument, { podId }, { auth: true });
    await refetch();
    return res.joinPodMeeting.meeting_url;
  };

  const onConfirmBackout = async (seats?: number) => {
    /* istanbul ignore next -- the dialog only mounts when `pod` exists */
    if (!pod) return;
    try {
      await backout(pod.id, seats);
      setBackoutOpen(false);
      await refetch();
    } catch {
      setBackoutOpen(false);
    }
  };

  // "Keep My Spot" — a server refusal (replacement confirmed) stays inside the
  // dialog so the user sees why the booking cannot be restored.
  const onConfirmKeepSpot = async () => {
    /* istanbul ignore next -- the dialog only mounts when `pod` exists */
    if (!pod) return;
    setKeepSpotError(null);
    try {
      await cancelBackout(pod.id);
      setKeepSpotOpen(false);
      await refetch();
    } catch (err) {
      setKeepSpotError(toErrorMessage(err));
      await refetch();
    }
  };

  const openKeepSpot = () => {
    setKeepSpotError(null);
    setKeepSpotOpen(true);
  };

  const onShare = async () => {
    /* istanbul ignore next -- the share button only mounts when `pod` exists */
    if (!pod) return;
    try {
      // The pod link and its venue map link both go out tracked (rule 40).
      const { message } = podShareMessage(pod, await podShareLinks(pod.id, pod));
      // Deliberately NO `url` — `message` already ends with the pod link, and
      // passing both makes iOS's sheet carry the link as a second item, which
      // is how the shared text arrived with the link written twice. mWeb omits
      // its Web Share `url` field for the same reason (rule 27).
      await Share.share({ message, title: pod.pod_title });
    } catch {
      /* user cancelled */
    }
  };

  return {
    seats,
    setSeats,
    joinError,
    onJoinFree,
    onJoinMeeting,
    backoutOpen,
    setBackoutOpen,
    backingOut,
    onConfirmBackout,
    keepSpotOpen,
    setKeepSpotOpen,
    keepSpotError,
    openKeepSpot,
    onConfirmKeepSpot,
    restoringSpot,
    onShare,
  };
}

export type PodDetailActions = ReturnType<typeof usePodDetailActions>;
