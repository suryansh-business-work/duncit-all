import { requireSonarConfig } from '@utils/sonarqube';
import type { AnalyticsWindow } from './window';
import { measureHistory, projectMeasures, standingSeries, valueAt } from './sonar.data';
import {
  branchCoverage,
  lineCoverage,
  measureOf,
  overallCoverage,
  sonarAreas,
  sonarWorkspaces,
  type SonarGroup,
} from './sonar.workspaces';
import {
  bandSlices,
  breakdown,
  kpi,
  rankedSlices,
  trend,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type Band,
  type EntityAnalyticsSections,
} from './shapes';

/**
 * Analytics > Testing > Unit Test Coverage — the coverage CI uploads to
 * SonarQube with every scan: how much of the code the unit suites run, how it
 * moved over the period, and which workspaces carry the uncovered lines.
 */

const PERCENT = { format: 'PERCENT' } as const;
const LOWER = { higherIsBetter: false } as const;

/** Tile key → SonarQube metric, for the tiles read straight off the project. */
const METRIC_OF = {
  cov_overall: 'coverage',
  cov_lines: 'line_coverage',
  cov_branches: 'branch_coverage',
  cov_new_code: 'new_coverage',
  cov_lines_to_cover: 'lines_to_cover',
  cov_uncovered_lines: 'uncovered_lines',
  cov_uncovered_conditions: 'uncovered_conditions',
} as const;

type TileKey = keyof typeof METRIC_OF;

const COVERAGE_BANDS: Band[] = [
  { key: 'cov_0_49', min: 0 },
  { key: 'cov_50_79', min: 50 },
  { key: 'cov_80_99', min: 80 },
  { key: 'cov_100', min: 100 },
];

/** Only workspaces with code a unit test could run — a config-only folder has no coverage to report. */
const measurable = (group: SonarGroup) => measureOf(group.measures, 'lines_to_cover') > 0;
const pathOf = (group: SonarGroup) => group.path;

function coverageLeaderboard(workspaces: readonly SonarGroup[]): AnalyticsLeaderboard {
  const ranked = [...workspaces].sort(
    (a, b) => measureOf(b.measures, 'uncovered_lines') - measureOf(a.measures, 'uncovered_lines')
  );
  return {
    key: 'cov_workspaces',
    columns: [
      { key: 'coverage', format: 'PERCENT' },
      { key: 'line_coverage', format: 'PERCENT' },
      { key: 'branch_coverage', format: 'PERCENT' },
      { key: 'uncovered_lines', format: 'COUNT' },
      { key: 'lines_to_cover', format: 'COUNT' },
    ],
    rows: ranked.map((group) => ({
      id: group.path,
      name: group.path,
      caption: null,
      values: [
        overallCoverage(group.measures),
        lineCoverage(group.measures),
        branchCoverage(group.measures),
        measureOf(group.measures, 'uncovered_lines'),
        measureOf(group.measures, 'lines_to_cover'),
      ],
    })),
  };
}

export async function coverageAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const cfg = await requireSonarConfig();
  const metrics = Object.values(METRIC_OF);
  const [now, history, allWorkspaces] = await Promise.all([
    projectMeasures(cfg, metrics),
    measureHistory(cfg, metrics),
    sonarWorkspaces(cfg),
  ]);
  const workspaces = allWorkspaces.filter(measurable);
  const areas = sonarAreas(workspaces);
  // `new_*` metrics keep no history, so the new-code tile is a live reading.
  const tile = (key: TileKey, options: Parameters<typeof kpi>[3] = {}): AnalyticsKpi[] => {
    const value = now.get(METRIC_OF[key]);
    if (value === undefined) return [];
    return [kpi(key, value, valueAt(history.get(METRIC_OF[key]), window.from), options)];
  };
  const series = (key: TileKey) => ({ key, values: standingSeries(history.get(METRIC_OF[key]), window) });

  return {
    kpis: [
      ...tile('cov_overall', PERCENT),
      ...tile('cov_lines', PERCENT),
      ...tile('cov_branches', PERCENT),
      ...tile('cov_new_code', PERCENT),
      ...tile('cov_uncovered_lines', LOWER),
      ...tile('cov_uncovered_conditions', LOWER),
      ...tile('cov_lines_to_cover'),
      kpi('cov_full_workspaces', workspaces.filter((group) => overallCoverage(group.measures) === 100).length, null),
    ],
    trends: [
      trend('cov_trend', window, [series('cov_overall'), series('cov_lines'), series('cov_branches')], 'PERCENT'),
      trend('cov_uncovered', window, [series('cov_uncovered_lines'), series('cov_uncovered_conditions')]),
    ],
    breakdowns: [
      breakdown('cov_by_area', rankedSlices(areas, pathOf, (area) => overallCoverage(area.measures)), {
        format: 'PERCENT',
        scope: 'ALL_TIME',
      }),
      breakdown('cov_bands', bandSlices(workspaces.map((group) => overallCoverage(group.measures)), COVERAGE_BANDS), {
        scope: 'ALL_TIME',
        ordered: true,
      }),
      breakdown(
        'cov_uncovered_by_area',
        rankedSlices(areas, pathOf, (area) => measureOf(area.measures, 'uncovered_lines')),
        { scope: 'ALL_TIME' }
      ),
    ],
    leaderboard: coverageLeaderboard(workspaces),
  };
}
