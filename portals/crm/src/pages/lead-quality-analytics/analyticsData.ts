import { crmFormatScore, crmIsEmptyAnalytics, crmIsoWeekMonday, crmShareOf, crmSumCounts } from '@duncit/utils';
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

/*
  The helpers live in @duncit/utils (crm-quality-analytics), shared with the
  Duncit CRM app's Quality Analytics; these are the portal's names.
*/

/** Counts that share a key added up across lead types, in first-seen order. */
export const sumCounts = (lists: ReadonlyArray<ReadonlyArray<CountRow>>): CountRow[] => crmSumCounts(lists);

/** A score to one decimal, or a dash when nothing was scored. */
export const formatScore = (value: number | null | undefined): string => crmFormatScore(value, EM_DASH);

/** Share of a total as a whole percentage, or null when there is no total. */
export const shareOf = crmShareOf;

/** The Monday of an ISO week ("2026-W45"), in the admin's date format; the raw value if it cannot be read. */
export function formatWeek(week: string): string {
  const monday = crmIsoWeekMonday(week);
  return monday ? formatDate(monday) || week : week;
}

/** True when there is nothing to chart: no lead of the chosen types and nothing in the research queue. */
export const isEmptyAnalytics = (data: LeadQualityAnalytics): boolean => crmIsEmptyAnalytics(data);
