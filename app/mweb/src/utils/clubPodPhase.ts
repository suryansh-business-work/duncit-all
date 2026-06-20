import { podStatus } from './podStatus';

export type ClubPodPhase = 'SOON' | 'UPCOMING' | 'PREVIOUS';

// "Happening soon" = live now, or starting within this window.
const SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Buckets a club pod into the Pods Schedule rails: Happening Soon / Upcoming / Previous. */
export const clubPodPhase = (start?: string | null, end?: string | null): ClubPodPhase => {
  const status = podStatus(start, end);
  if (status === 'ENDED') return 'PREVIOUS';
  if (status === 'LIVE') return 'SOON';
  const startMs = start ? new Date(start).getTime() : Number.NaN;
  if (!Number.isNaN(startMs) && startMs - Date.now() <= SOON_WINDOW_MS) return 'SOON';
  return 'UPCOMING';
};
