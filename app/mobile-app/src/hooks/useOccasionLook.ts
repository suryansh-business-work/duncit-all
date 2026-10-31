import { useEffect } from 'react';
import { AppState } from 'react-native';
import { logs } from '@duncit/logs';
import type { OccasionDesign } from '@duncit/utils';

import { useOccasionStore } from '@/stores/occasion.store';

/** A live look as the app wears it: the design without its catalogue name. */
export type OccasionLook = Omit<OccasionDesign, 'name'>;

/** Never ask again sooner than this, so a clock running ahead cannot spin the request. */
const MIN_WAIT_MS = 15_000;
/** setTimeout overflows past ~24.8 days; a day is plenty and refreshes the next change too. */
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;
/** Ask a moment after the change, so the server has already switched. */
const SETTLE_MS = 1_000;

/** Milliseconds until the look may change, within sane bounds; null when nothing is scheduled. */
export function nextLookCheckDelay(
  nextChangeAt: string | null | undefined,
  now: number,
): number | null {
  if (!nextChangeAt) return null;
  const at = Date.parse(nextChangeAt);
  if (Number.isNaN(at)) return null;
  return Math.min(MAX_WAIT_MS, Math.max(MIN_WAIT_MS, at - now + SETTLE_MS));
}

/**
 * The festive look Marketing → Occasions has live, or null for the house
 * look. Asked once per launch, again whenever the app comes back to the
 * front, and again when a scheduled look opens or closes while the app is
 * open. A failure is logged and leaves the house look (or the last look).
 */
export function useOccasionLook(): OccasionLook | null {
  const live = useOccasionStore((s) => s.data?.occasionLive);
  const error = useOccasionStore((s) => s.error);
  const fetch = useOccasionStore((s) => s.fetch);
  const refetch = useOccasionStore((s) => s.refetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  // Keyed on the answer, not its date: an early timer that gets the same date
  // back still waits again instead of stopping.
  useEffect(() => {
    const delay = nextLookCheckDelay(live?.next_change_at, Date.now());
    if (delay === null) return undefined;
    const timer = setTimeout(() => {
      refetch();
    }, delay);
    return () => clearTimeout(timer);
  }, [live, refetch]);

  useEffect(() => {
    if (error) logs.mobileApp.warn('useOccasionLook', 'occasionLive', { error });
  }, [error]);

  return live?.theme ?? null;
}
