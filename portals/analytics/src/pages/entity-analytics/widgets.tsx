import { Chip } from '@mui/material';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/app-settings';
import KpiTile from './KpiTile';
import TrendChart from './TrendChart';
import BreakdownChart, { ScopeChip } from './BreakdownChart';
import LeaderboardTable from './LeaderboardTable';
import { BREAKDOWN_COPY, GRANULARITY_COPY, LEADERBOARD_COPY, TREND_COPY } from './copy';
import type { EntityAnalytics } from './queries';

/**
 * An Analytics payload as dashboard widgets: every headline number, trend,
 * breakdown and the ranking is its own panel, so each reader can put the
 * numbers they watch first and the layout follows them between machines.
 *
 * Widget ids come from the server's keys (`kpi-fill_rate`), never positions —
 * a saved layout refers to them, and a key that stays put keeps its slot. The
 * default arrangement reads top to bottom: tiles, trends, breakdowns, ranking.
 */

type Translate = ReturnType<typeof useTranslation>['t'];

/** Grid units (12 columns; rows of the dashboard's cell height). */
const KPI = { perRow: 4, w: 3, h: 2 } as const;
const TREND = { perRow: 2, w: 6, h: 5 } as const;
const BREAKDOWN = { perRow: 3, w: 4, h: 5 } as const;
const LEADERBOARD_H = 8;

const rowsOf = (count: number, perRow: number, height: number) => Math.ceil(count / perRow) * height;

function kpiWidgets(board: EntityAnalytics): DashboardWidget[] {
  return board.kpis.map((kpi, index) => ({
    id: `kpi-${kpi.key}`,
    bare: true,
    defaultLayout: {
      x: (index % KPI.perRow) * KPI.w,
      y: Math.floor(index / KPI.perRow) * KPI.h,
      w: KPI.w,
      h: KPI.h,
    },
    minW: 2,
    minH: 2,
    content: <KpiTile kpi={kpi} days={board.period.days} />,
  }));
}

function trendWidgets(board: EntityAnalytics, t: Translate, top: number): DashboardWidget[] {
  const count = board.trends.length;
  return board.trends.map((trend, index) => {
    const copy = TREND_COPY[trend.key];
    const title = copy ? t(copy.title) : trend.key;
    // A trend that would sit alone on its row takes the whole row.
    const alone = count % TREND.perRow === 1 && index === count - 1;
    return {
      id: `trend-${trend.key}`,
      title,
      subtitle: copy ? t(copy.hint) : undefined,
      headerActions: <Chip size="small" variant="outlined" label={t(GRANULARITY_COPY[trend.granularity])} />,
      fitContent: true,
      defaultLayout: {
        x: alone ? 0 : (index % TREND.perRow) * TREND.w,
        y: top + Math.floor(index / TREND.perRow) * TREND.h,
        w: alone ? 12 : TREND.w,
        h: TREND.h,
      },
      minW: 4,
      minH: 3,
      content: <TrendChart trend={trend} label={title} />,
    };
  });
}

function breakdownWidgets(board: EntityAnalytics, t: Translate, top: number): DashboardWidget[] {
  return board.breakdowns.map((breakdown, index) => {
    const title = t(BREAKDOWN_COPY[breakdown.key] ?? breakdown.key);
    return {
      id: `breakdown-${breakdown.key}`,
      title,
      headerActions: <ScopeChip breakdown={breakdown} />,
      fitContent: true,
      defaultLayout: {
        x: (index % BREAKDOWN.perRow) * BREAKDOWN.w,
        y: top + Math.floor(index / BREAKDOWN.perRow) * BREAKDOWN.h,
        w: BREAKDOWN.w,
        h: BREAKDOWN.h,
      },
      minW: 3,
      minH: 3,
      content: <BreakdownChart breakdown={breakdown} label={title} />,
    };
  });
}

function leaderboardWidget(board: EntityAnalytics, t: Translate, top: number): DashboardWidget[] {
  const leaderboard = board.leaderboard;
  if (!leaderboard) return [];
  const copy = LEADERBOARD_COPY[leaderboard.key];
  return [
    {
      id: `leaderboard-${leaderboard.key}`,
      title: copy ? t(copy.title) : leaderboard.key,
      subtitle: copy ? t(copy.hint) : undefined,
      // A table fills the slot it is given and scrolls inside it, so it gets a fixed height.
      disablePadding: true,
      defaultLayout: { x: 0, y: top, w: 12, h: LEADERBOARD_H },
      minW: 6,
      minH: 5,
      content: <LeaderboardTable leaderboard={leaderboard} />,
    },
  ];
}

export function buildAnalyticsWidgets(board: EntityAnalytics, t: Translate): DashboardWidget[] {
  const trendsTop = rowsOf(board.kpis.length, KPI.perRow, KPI.h);
  const breakdownsTop = trendsTop + rowsOf(board.trends.length, TREND.perRow, TREND.h);
  const leaderboardTop = breakdownsTop + rowsOf(board.breakdowns.length, BREAKDOWN.perRow, BREAKDOWN.h);
  return [
    ...kpiWidgets(board),
    ...trendWidgets(board, t, trendsTop),
    ...breakdownWidgets(board, t, breakdownsTop),
    ...leaderboardWidget(board, t, leaderboardTop),
  ];
}
