/**
 * Occasion windows — which festive icon set is active "now".
 *
 * Lives beside the clock on purpose: the active occasion is a pure function of
 * the application clock, so a custom admin time switches the icons too.
 */

import { toEpochMs } from './clock';

export interface OccasionWindow {
  /** Stable key; also the native app's local asset folder name. */
  slug: string;
  label?: string | null;
  /** Inclusive start instant (ISO). */
  starts_at?: string | number | Date | null;
  /** Inclusive end instant (ISO). */
  ends_at?: string | number | Date | null;
  is_active?: boolean | null;
  sort_order?: number | null;
}

/**
 * The occasion covering `nowMs`. Inactive windows and windows with unusable
 * dates are ignored. When several overlap, the one with the highest
 * `sort_order` wins (ties break on the later start), so an admin can layer a
 * short campaign over a long season. Returns null when nothing is active.
 */
export function resolveActiveOccasion<T extends OccasionWindow>(
  occasions: readonly T[] | null | undefined,
  nowMs: number,
): T | null {
  let best: T | null = null;
  let bestRank: [number, number] = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

  for (const occasion of occasions ?? []) {
    if (occasion.is_active === false) continue;
    const start = toEpochMs(occasion.starts_at);
    const end = toEpochMs(occasion.ends_at);
    if (start === null || end === null) continue;
    if (nowMs < start || nowMs > end) continue;
    const rank: [number, number] = [occasion.sort_order ?? 0, start];
    if (rank[0] > bestRank[0] || (rank[0] === bestRank[0] && rank[1] > bestRank[1])) {
      best = occasion;
      bestRank = rank;
    }
  }
  return best;
}
