export type PodStatus = 'LIVE' | 'UPCOMING' | 'ENDED';

// When a pod has no explicit end time, treat it as live for this long after start.
const LIVE_TAIL_MS = 4 * 60 * 60 * 1000;

/** Derives a pod's status from its start (and optional end) timestamp relative to now. */
export const podStatus = (start?: string | null, end?: string | null): PodStatus => {
  if (!start) return 'UPCOMING';
  const now = Date.now();
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return 'UPCOMING';
  const endMs = end ? new Date(end).getTime() : startMs + LIVE_TAIL_MS;
  if (now < startMs) return 'UPCOMING';
  if (now <= endMs) return 'LIVE';
  return 'ENDED';
};

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
