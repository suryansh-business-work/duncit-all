/** How many bars a ranking shows; the rest are one click away on their own page. */
export const TOP_N = 10;

/** A ranking ready for RankBars: labels top to bottom and one series of values. */
export interface Ranking {
  labels: string[];
  values: number[];
}

/**
 * The top rows by `value`, biggest first (ties by label), keeping only those
 * above zero: an unused feature is not "the cheapest", it is absent.
 */
export function rankBy<T>(
  rows: readonly T[],
  label: (row: T) => string,
  value: (row: T) => number,
  limit = TOP_N
): Ranking {
  const ranked = rows
    .map((row) => ({ label: label(row), value: value(row) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
  return { labels: ranked.map((row) => row.label), values: ranked.map((row) => row.value) };
}
