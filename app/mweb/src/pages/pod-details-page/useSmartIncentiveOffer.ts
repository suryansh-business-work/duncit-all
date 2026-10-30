import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { fireAndForget, logs } from '@duncit/logs';
import { POD_SMART_INCENTIVE, UNLOCK_SMART_INCENTIVE, usePodSmartIncentive } from '../../utils/smartIncentive';
import { useVisibleDwell } from './useVisibleDwell';

/** The member's Smart Incentive on the pod page. */
export interface SmartIncentiveOffer {
  /** Percent off the ticket money — frozen once unlocked. */
  pct: number;
  /** The popup was shown, so checkout takes it off on its own. */
  unlocked: boolean;
}

interface Args {
  /** The pod on screen — null while it loads. */
  pod: { id: string; smart_incentive_enabled?: boolean | null } | null;
  isFree: boolean;
  /** The viewer hosts it: a host is never offered a discount on their own pod. */
  isHost: boolean;
  /** The viewer already holds a seat (booked, or backing out). */
  joined: boolean;
}

/**
 * Smart Incentive on the pod page. A member who stays on a pod that offers it
 * without booking — for Loyalty's delay, counted only while the tab is in view
 * — unlocks the host's offer: the server records it and freezes the %, and the
 * popup opens, at most once per visit. Checkout then takes it off on its own.
 * The server decides who is eligible, so a refused or failed unlock is logged
 * and shows nothing.
 */
export function useSmartIncentiveOffer({ pod, isFree, isHost, joined }: Args) {
  const podId = pod?.id ?? '';
  // The server's own rule, so a viewer it would refuse is never even asked about.
  const offered = !!podId && !!pod?.smart_incentive_enabled && !isFree && !isHost && !joined;
  const { state } = usePodSmartIncentive(podId, { skip: !offered, fetchPolicy: 'cache-and-network' });
  const [unlock] = useMutation(UNLOCK_SMART_INCENTIVE, {
    // The answer replaces the page's own read: the booking bar drops to the
    // offer price at once, and checkout reads it unlocked from the cache.
    update: (cache, { data }, { variables }) => {
      const unlocked = data?.unlockSmartIncentive;
      if (!unlocked || !variables) return;
      cache.writeQuery({ query: POD_SMART_INCENTIVE, variables, data: { podSmartIncentive: unlocked } });
    },
  });
  // The pod this visit has already counted down on, and the pod whose popup is up.
  const [attemptedFor, setAttemptedFor] = useState<string | null>(null);
  const [popupFor, setPopupFor] = useState<string | null>(null);
  const offer: SmartIncentiveOffer | null =
    offered && state ? { pct: state.discount_pct, unlocked: state.unlocked } : null;

  const unlockAndShow = async (forPod: string) => {
    const result = await unlock({ variables: { pod_id: forPod } });
    if (result.data?.unlockSmartIncentive.unlocked) setPopupFor(forPod);
  };

  const counting = !!offer && !offer.unlocked && attemptedFor !== podId;
  useVisibleDwell(counting ? podId : null, state?.delay_seconds ?? 0, () => {
    setAttemptedFor(podId);
    fireAndForget(unlockAndShow(podId), logs.mWeb, 'PodDetails', 'unlockSmartIncentive');
  });

  return {
    offer,
    dialogOpen: !!offer && popupFor === podId,
    closeDialog: () => setPopupFor(null),
  };
}
