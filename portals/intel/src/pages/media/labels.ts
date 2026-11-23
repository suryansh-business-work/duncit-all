/** Literal catalogue keys for Media Manager states, so the translation gate sees each one. */

export const INDEX_KEYS: Record<string, string> = {
  INDEXED: 'intel.media.index.INDEXED',
  FAILED: 'intel.media.index.FAILED',
  INDEXING: 'intel.media.index.INDEXING',
  PENDING: 'intel.media.index.PENDING',
  SKIPPED: 'intel.media.index.SKIPPED',
};

export const INDEX_COLOR: Record<string, 'default' | 'success' | 'error' | 'info' | 'warning'> = { INDEXED: 'success', FAILED: 'error', INDEXING: 'info', PENDING: 'info', SKIPPED: 'warning' };

export const VISIBILITY_KEYS: Record<string, string> = { PRIVATE: 'intel.media.visibility.PRIVATE', TEAM: 'intel.media.visibility.TEAM', ADMINS: 'intel.media.visibility.ADMINS' };

export const MEDIA_VIEWS = ['ALL', 'RECENT', 'FAVORITES', 'ARCHIVED', 'TRASH'] as const;
export type MediaView = (typeof MEDIA_VIEWS)[number];

export const VIEW_KEYS: Record<MediaView, string> = {
  ALL: 'intel.media.views.ALL',
  RECENT: 'intel.media.views.RECENT',
  FAVORITES: 'intel.media.views.FAVORITES',
  ARCHIVED: 'intel.media.views.ARCHIVED',
  TRASH: 'intel.media.views.TRASH',
};
