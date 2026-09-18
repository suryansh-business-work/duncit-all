/**
 * Why a check could not judge an alert — the server sends a code, the console
 * words it. Every key is written out so the localization gate can see it.
 */
const ERROR_KEYS: Partial<Record<string, string>> = {
  TILE_GONE: 'analytics.alerts.errorTileGone',
  NO_COMPARISON: 'analytics.alerts.errorNoComparison',
  LOAD_FAILED: 'analytics.alerts.errorLoadFailed',
};

export const alertErrorKey = (code: string | null | undefined): string =>
  (code && ERROR_KEYS[code]) || 'analytics.alerts.errorLoadFailed';
