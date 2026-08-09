import type { PodHistoryItem } from './queries';

/** `label` is a translation key, not text — the chip resolves it through `t`. */
export type StatusChipMeta = { label: string; color: 'success' | 'warning' };

/** Booking-status chip copy — "Backout in process" is its own visible state.
 * The words live in @duncit/i18n so mWeb and the native app cannot drift. */
export const STATUS_CHIP: Record<PodHistoryItem['status'], StatusChipMeta> = {
  JOINED: { label: 'mweb.podHistory.statusJoined', color: 'success' },
  BACKOUT_IN_PROCESS: { label: 'mweb.podHistory.statusBackoutInProcess', color: 'warning' },
  BACKED_OUT: { label: 'mweb.podHistory.statusBackedOut', color: 'warning' },
};
