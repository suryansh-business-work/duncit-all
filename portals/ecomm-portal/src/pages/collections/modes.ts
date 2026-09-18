import type { CollectionMode } from './queries';

/** How a collection is filled, and the words for each way. */
export const MODE_KEYS: Record<CollectionMode, string> = {
  MANUAL: 'ecommPortal.collections.modeManual',
  SMART: 'ecommPortal.collections.modeSmart',
};

/** What each way means, shown under its choice. */
export const MODE_HINT_KEYS: Record<CollectionMode, string> = {
  MANUAL: 'ecommPortal.collections.modeManualHint',
  SMART: 'ecommPortal.collections.modeSmartHint',
};
