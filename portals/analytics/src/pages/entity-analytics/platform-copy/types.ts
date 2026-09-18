import type { CopyMap, LeaderboardCopy, TitledCopy } from '../copy';

/** Slice words per breakdown key — see slice-copy.ts. */
export type SliceCopy = Partial<Record<string, Partial<Record<string, string>>>>;

/**
 * Everything one Tech, Security or Testing page names, in the same shape as the
 * console's lookup maps so copy.ts can fold it in. Keys are written out
 * literally, once, for the localization gate.
 */
export interface PageCopy {
  kpis: CopyMap<TitledCopy>;
  trends: CopyMap<TitledCopy>;
  series: CopyMap<string>;
  breakdowns: CopyMap<string>;
  slices: SliceCopy;
  leaderboards: CopyMap<LeaderboardCopy>;
  columns: CopyMap<string>;
}
