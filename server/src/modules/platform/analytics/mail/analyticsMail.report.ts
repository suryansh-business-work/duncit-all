import { appDate, appDateTime } from '@utils/app-time';
import { entityAnalyticsService } from '../entity/entityAnalytics.service';
import type { AnalyticsEntity, AnalyticsLeaderboard } from '../entity/shapes';
import { ANALYTICS_ENTITIES, ANALYTICS_MAIL_PAGES, analyticsConsoleUrl } from './analyticsMail.pages';
import { copySegment, type ReportCopy } from './analyticsMail.copy';
import { formatAnalyticsValue, formatCell, kpiDelta, type DeltaTone } from './analyticsMail.format';

/**
 * One subscriber's report, already in words: every tile of every dashboard
 * they chose, with its value and how it moved, plus each dashboard's ranking.
 * The mail and the PDF draw this same object, so they can never disagree.
 */

type Board = Awaited<ReturnType<typeof entityAnalyticsService.load>>;

/** Loads one dashboard for one period. */
export type BoardLoader = (entity: AnalyticsEntity, days: number) => Promise<Board>;

/** One load per dashboard and period for a whole run — ten readers of Pods cost one query. */
export function cachedBoards(): BoardLoader {
  const cache = new Map<string, Promise<Board>>();
  return (entity, days) => {
    const key = `${entity}:${days}`;
    const hit = cache.get(key) ?? entityAnalyticsService.load(entity, { days });
    cache.set(key, hit);
    return hit;
  };
}

export interface ReportKpi {
  title: string;
  value: string;
  change: string;
  tone: DeltaTone | null;
}

export interface ReportTable {
  title: string;
  columns: string[];
  rows: Array<{ id: string; name: string; values: string[] }>;
}

export interface ReportSection {
  entity: AnalyticsEntity;
  title: string;
  url: string;
  kpis: ReportKpi[];
  table: ReportTable | null;
  /** Why this dashboard could not be read (SonarQube not connected, say) — the rest of the report still goes. */
  error: string | null;
}

export interface AnalyticsReport {
  title: string;
  period: string;
  generated: string;
  url: string;
  sections: ReportSection[];
}

interface ReportInput {
  title: string;
  pages: readonly AnalyticsEntity[];
  days: number;
  copy: ReportCopy;
  currency: string;
  load: BoardLoader;
  now: Date;
}

const RANKING_ROWS = 10;
const DAY_MS = 86_400_000;

function tableOf(board: AnalyticsLeaderboard, input: ReportInput): ReportTable {
  return {
    title: input.copy.t(`analytics.leaderboard.${copySegment(board.key)}`),
    columns: board.columns.map((column) => input.copy.t(`analytics.leaderboard.${copySegment(column.key)}`)),
    rows: board.rows.slice(0, RANKING_ROWS).map((row) => ({
      id: row.id,
      name: row.name,
      values: board.columns.map((column, index) =>
        formatCell(row.values[index], column.format, input.currency, input.copy)
      ),
    })),
  };
}

async function sectionFor(entity: AnalyticsEntity, input: ReportInput): Promise<ReportSection> {
  const page = ANALYTICS_MAIL_PAGES[entity];
  const base = {
    entity,
    title: input.copy.t(`analytics.page.${page.copy}.title`),
    url: analyticsConsoleUrl(page.path),
  };
  let board: Board;
  try {
    board = await input.load(entity, input.days);
  } catch (err) {
    return { ...base, kpis: [], table: null, error: err instanceof Error ? err.message : String(err) };
  }
  const kpis = board.kpis.map((kpi) => {
    const delta = kpiDelta(kpi, board.period.days, input.copy);
    return {
      title: input.copy.t(`analytics.kpi.${copySegment(kpi.key)}`),
      value: formatAnalyticsValue(kpi.value, kpi.format, input.currency),
      change: delta.text,
      tone: delta.tone,
    };
  });
  return { ...base, kpis, table: board.leaderboard ? tableOf(board.leaderboard, input) : null, error: null };
}

export async function buildReport(input: ReportInput): Promise<AnalyticsReport> {
  const chosen = new Set(input.pages);
  const ordered = ANALYTICS_ENTITIES.filter((entity) => chosen.has(entity));
  const sections = await Promise.all(ordered.map((entity) => sectionFor(entity, input)));
  const from = new Date(input.now.getTime() - input.days * DAY_MS);
  return {
    title: input.title,
    period: input.copy.t('email.analyticsReport.periodValue', {
      days: input.days,
      from: appDate(from),
      to: appDate(input.now),
    }),
    generated: appDateTime(input.now),
    url: analyticsConsoleUrl(),
    sections,
  };
}
