/**
 * The "Did you know?" loader's DATA and ROTATION — one list of tips and one
 * rule for stepping through them, shared by mWeb (MUI) and the native app
 * (Tamagui) so both show the same tips in the same order (CLAUDE.md rules 29 +
 * 56). Only translation keys live here: each surface resolves them with its
 * own `t()`, so the copy stays in `@duncit/i18n` (`mweb.loadingTips.*`).
 *
 * Every key is written out as a literal, once, because the translation gate
 * greps source for each shipped key — a composed key would read as unrendered.
 */

/** The heading over the rotating tip. */
export const LOADING_TIP_TITLE_KEY = 'mweb.loadingTips.title';

/** The tips, in the order the loader shows them. */
export const LOADING_TIP_KEYS = [
  'mweb.loadingTips.tipPodTimeline',
  'mweb.loadingTips.tipFollowClubs',
  'mweb.loadingTips.tipSearchInterests',
  'mweb.loadingTips.tipRatePods',
  'mweb.loadingTips.tipSharePods',
  'mweb.loadingTips.tipChangeCity',
] as const;

export type LoadingTipKey = (typeof LOADING_TIP_KEYS)[number];

/** How long each tip stays up — long enough to read a short sentence. */
export const LOADING_TIP_INTERVAL_MS = 4000;

/**
 * The tip after `current`, wrapping back to the first. A position that is not
 * a whole number in range (NaN, negative, stale after the list shrank) starts
 * over at the first tip; an empty list always answers 0.
 */
export function nextLoadingTipIndex(current: number, count: number = LOADING_TIP_KEYS.length): number {
  if (count <= 0) return 0;
  if (!Number.isInteger(current) || current < 0 || current >= count) return 0;
  return (current + 1) % count;
}

/** The tip key at `index`, clamped into the list so a stale index never reads undefined. */
export function loadingTipKeyAt(index: number): LoadingTipKey {
  const safe = Number.isInteger(index) && index >= 0 ? index % LOADING_TIP_KEYS.length : 0;
  /* v8 ignore next -- `safe` is always in range; the fallback only satisfies noUncheckedIndexedAccess */
  return LOADING_TIP_KEYS[safe] ?? LOADING_TIP_KEYS[0];
}
