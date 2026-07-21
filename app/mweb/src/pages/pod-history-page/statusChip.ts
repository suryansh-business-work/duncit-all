import type { PodHistoryItem } from './queries';

export type StatusChipMeta = { label: string; color: 'success' | 'warning' };

/** Booking-status chip copy — "Backout in process" is its own visible state. */
export const STATUS_CHIP: Record<PodHistoryItem['status'], StatusChipMeta> = {
  JOINED: { label: 'Joined', color: 'success' },
  BACKOUT_IN_PROCESS: { label: 'Backout in process', color: 'warning' },
  BACKED_OUT: { label: 'Backed out', color: 'warning' },
};
