import { podPhase, type PodPhase } from '@duncit/utils';

export type PodStatus = 'LIVE' | 'UPCOMING' | 'ENDED';

/** The chip vocabulary this surface speaks, over the shared time rule. */
const STATUS_OF_PHASE: Record<PodPhase, PodStatus> = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'LIVE',
  PREVIOUS: 'ENDED',
};

/** Derives a pod's status from its start (and optional end) timestamp relative to now.
 * The start/end/tail rule itself lives in @duncit/utils, so the status chip and
 * the Home rails' Ongoing bucket can never read the same pod differently. */
export const podStatus = (start?: string | null, end?: string | null): PodStatus =>
  STATUS_OF_PHASE[podPhase(start, end)];

/** True for pods that have not ended yet (live or upcoming) — used to hide past pods. */
export const isPodActive = (start?: string | null, end?: string | null): boolean =>
  podStatus(start, end) !== 'ENDED';

/** True once the pod's start time has passed — the canonical "expired" test used
 * across Explore (join closed) and Pod details (shop disabled, "Attended"). */
export const isPodExpired = (start?: string | null): boolean => {
  if (!start) return false;
  const ms = new Date(start).getTime();
  return !Number.isNaN(ms) && ms < Date.now();
};

interface StatusChip {
  label: string;
  color: 'success' | 'warning' | 'default';
}

const STATUS_CHIPS: Record<PodStatus, StatusChip> = {
  LIVE: { label: 'Live', color: 'success' },
  UPCOMING: { label: 'Upcoming', color: 'warning' },
  ENDED: { label: 'Ended', color: 'default' },
};

/** Maps a pod status to a Chip label + color so badges stay consistent everywhere. */
export const podStatusChip = (status: PodStatus): StatusChip => STATUS_CHIPS[status];
