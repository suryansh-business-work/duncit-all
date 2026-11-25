/**
 * Helpers for CRM › Quality Analytics, shared by the CRM portal's page and the
 * Duncit CRM app's. The server works the numbers out from the stored scores;
 * these only combine and format what it sends.
 */

export interface CrmCountRow {
  key: string;
  label: string;
  count: number;
}

/**
 * Counts that share a key (a score bucket, a classification) added up across
 * lead types, in the order they first appear — the server already orders the
 * buckets low to high.
 */
export function crmSumCounts(lists: ReadonlyArray<ReadonlyArray<CrmCountRow>>): CrmCountRow[] {
  const merged = new Map<string, CrmCountRow>();
  for (const row of lists.flat()) {
    const current = merged.get(row.key);
    merged.set(row.key, current ? { ...current, count: current.count + row.count } : { key: row.key, label: row.label, count: row.count });
  }
  return [...merged.values()];
}

/** A score to one decimal, or `dash` when nothing was scored. */
export const crmFormatScore = (value: number | null | undefined, dash: string): string =>
  typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 10) / 10) : dash;

/** Share of a total as a whole percentage, or null when there is no total. */
export const crmShareOf = (part: number, total: number): number | null => (total > 0 ? Math.round((part / total) * 100) : null);

/** True when there is nothing to show: no lead of the chosen types and nothing in the research queue. */
export const crmIsEmptyAnalytics = (data: {
  by_type: ReadonlyArray<{ total: number }>;
  research_queue: ReadonlyArray<{ count: number }>;
}): boolean => data.by_type.every((stats) => stats.total === 0) && data.research_queue.every((row) => row.count === 0);

/**
 * The Monday an ISO week ("2026-W45") starts on, as a local date; null when
 * the value is not an ISO week. Week 1 is the week holding January 4th.
 */
export function crmIsoWeekMonday(week: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!match) return null;
  const year = Number(match[1]);
  const number = Number(match[2]);
  if (number < 1 || number > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const firstMonday = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7));
  return new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + (number - 1) * 7);
}
