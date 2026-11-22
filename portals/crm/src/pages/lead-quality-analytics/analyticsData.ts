import { parse, startOfISOWeek } from 'date-fns';
import { formatDate } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import type { LeadQualityAnalytics } from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';

export type TypeStats = LeadQualityAnalytics['by_type'][number];
export type CountRow = TypeStats['distribution'][number];
export type TopLead = LeadQualityAnalytics['top_leads'][number];
export type CityRow = LeadQualityAnalytics['cities'][number];
export type TrendRow = LeadQualityAnalytics['trend'][number];
export type ConversionRow = LeadQualityAnalytics['conversion'][number];
export type OriginRow = LeadQualityAnalytics['origins'][number];
export type MissingRow = LeadQualityAnalytics['missing_evidence'][number];
export type QueueRow = LeadQualityAnalytics['research_queue'][number];

/** The selector's value: every lead type together, or one. */
export const ALL_TYPES = 'ALL';
export type AnalyticsType = typeof ALL_TYPES | CrmLeadEntityType;

/**
 * Counts that share a key (a score bucket, a classification) added up across
 * lead types, in the order they first appear — the server already orders the
 * buckets low to high.
 */
export function sumCounts(lists: ReadonlyArray<ReadonlyArray<CountRow>>): CountRow[] {
  const merged = new Map<string, CountRow>();
  for (const row of lists.flat()) {
    const current = merged.get(row.key);
    merged.set(row.key, current ? { ...current, count: current.count + row.count } : { key: row.key, label: row.label, count: row.count });
  }
  return [...merged.values()];
}

/** A score to one decimal, or a dash when nothing was scored. */
export const formatScore = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 10) / 10) : EM_DASH;

/** Share of a total as a whole percentage, or null when there is no total. */
export const shareOf = (part: number, total: number): number | null => (total > 0 ? Math.round((part / total) * 100) : null);

/** The Monday of an ISO week ("2026-W45"), in the admin's date format; the raw value if it cannot be read. */
export function formatWeek(week: string): string {
  const parsed = parse(week, "RRRR-'W'II", new Date(0));
  return Number.isNaN(parsed.getTime()) ? week : formatDate(startOfISOWeek(parsed)) || week;
}

/** True when there is nothing to chart: no lead of the chosen types and nothing in the research queue. */
export const isEmptyAnalytics = (data: LeadQualityAnalytics): boolean =>
  data.by_type.every((stats) => stats.total === 0) && data.research_queue.every((row) => row.count === 0);
