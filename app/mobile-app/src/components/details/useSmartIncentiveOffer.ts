import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import { PodSmartIncentiveDocument, UnlockSmartIncentiveDocument } from '@/graphql/details';
import { useAppActive } from '@/hooks/useAppActive';
import { graphqlRequest } from '@/services/graphql.client';

type PodSmartIncentive = NonNullable<
  ResultOf<typeof PodSmartIncentiveDocument>['podSmartIncentive']
>;

/**
 * Smart Incentive on the pod page. For a viewer who could still book a pod
 * whose host offers it, the page asks the server for the viewer's offer and,
 * unless it is already theirs, counts its delay down — only while this screen
 * is focused and the app is in front, pausing rather than restarting when
 * either goes away. Once the wait is over it unlocks the offer (that is what
 * records it and freezes its %) and opens the popup, at most once per visit.
 * A failed read or unlock is logged and shows nothing: the member pays full
 * price, exactly as if no offer existed.
 *
 * `eligible` is the booking bar's own facts — a signed-in viewer, a paid pod
 * that offers it, not its host, not a member and not backing out — so a
 * viewer the server would answer null for is never asked about it.
 */
export function useSmartIncentiveOffer(podId: string, eligible: boolean) {
  const appActive = useAppActive();
  const [offer, setOffer] = useState<PodSmartIncentive | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // The part of the wait a pause keeps, so coming back resumes the countdown.
  const remainingMs = useRef(0);
  const fired = useRef(false);
  const focused = useRef(false);
  // Bumped whenever the question changes (another pod, or the viewer booked),
  // so an unlock answered for the old one is dropped.
  const epoch = useRef(0);

  useEffect(() => {
    epoch.current += 1;
    setOffer(null);
    setDialogOpen(false);
    if (!podId || !eligible) return undefined;
    let active = true;
    graphqlRequest(PodSmartIncentiveDocument, { podId }, { auth: true })
      .then((data) => {
        if (active) setOffer(data.podSmartIncentive ?? null);
      })
      .catch((error: unknown) =>
        logs.mobileApp.warn('smartIncentive', 'offer', { pod_id: podId, error }),
      );
    return () => {
      active = false;
    };
  }, [podId, eligible]);

  // Every answer starts its own countdown from the full delay.
  useEffect(() => {
    fired.current = false;
    remainingMs.current = (offer?.delay_seconds ?? 0) * 1000;
  }, [offer]);

  const unlock = useCallback(() => {
    fired.current = true;
    const asked = epoch.current;
    graphqlRequest(UnlockSmartIncentiveDocument, { podId }, { auth: true })
      .then((data) => {
        if (epoch.current !== asked) return;
        setOffer(data.unlockSmartIncentive);
        // Only in front of someone still on the page: a member who has moved
        // on meets the offer as the booking bar's price instead.
        if (focused.current) setDialogOpen(true);
      })
      .catch((error: unknown) =>
        logs.mobileApp.warn('smartIncentive', 'unlock', { pod_id: podId, error }),
      );
  }, [podId]);

  // Leaving the page takes the popup with it — it never sits over another screen.
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
        setDialogOpen(false);
      };
    }, []),
  );

  const counting = appActive && !!offer && !offer.unlocked;
  useFocusEffect(
    useCallback(() => {
      if (!counting || fired.current) return undefined;
      const startedAt = Date.now();
      const timer = setTimeout(unlock, remainingMs.current);
      return () => {
        clearTimeout(timer);
        remainingMs.current = Math.max(0, remainingMs.current - (Date.now() - startedAt));
      };
    }, [counting, unlock]),
  );

  const closeDialog = useCallback(() => setDialogOpen(false), []);
  return {
    /** The member's unlocked %, 0 until the offer is theirs — what the booking bar prices with. */
    unlockedPct: offer?.unlocked ? offer.discount_pct : 0,
    dialogOpen,
    closeDialog,
  };
}
