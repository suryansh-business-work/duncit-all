import { requireSonarConfig } from '@utils/sonarqube';
import type { AnalyticsWindow } from './window';
import {
  failingGateConditions,
  measureHistory,
  openIssueFacets,
  projectMeasures,
  standingSeries,
  valueAt,
  type HistoryPoint,
} from './sonar.data';
import { measureOf, sonarAreas, sonarWorkspaces, type SonarGroup } from './sonar.workspaces';
import {
  breakdown,
  fixedSlices,
  kpi,
  rankedSlices,
  trend,
  type AnalyticsFormat,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';

/**
 * Analytics > Security > SonarQube — what the last scan found, how it moved
 * over the period, and where in the monorepo it sits. Read-only: triage stays
 * in SonarQube itself.
 */

interface MetricTile {
  key: string;
  metric: string;
  format?: AnalyticsFormat;
  higherIsBetter?: boolean;
}

const TILES: readonly MetricTile[] = [
  { key: 'sonar_security_issues', metric: 'software_quality_security_issues', higherIsBetter: false },
  { key: 'sonar_hotspots', metric: 'security_hotspots', higherIsBetter: false },
  { key: 'sonar_hotspots_reviewed', metric: 'security_hotspots_reviewed', format: 'PERCENT' },
  { key: 'sonar_security_rating', metric: 'software_quality_security_rating', format: 'GRADE', higherIsBetter: false },
  { key: 'sonar_reliability_issues', metric: 'software_quality_reliability_issues', higherIsBetter: false },
  { key: 'sonar_maintainability_issues', metric: 'software_quality_maintainability_issues', higherIsBetter: false },
  { key: 'sonar_duplication', metric: 'duplicated_lines_density', format: 'PERCENT', higherIsBetter: false },
];

const QUALITIES = ['SECURITY', 'RELIABILITY', 'MAINTAINABILITY'] as const;
const SEVERITIES = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const TOP = 10;

/** One tile per metric the scan measured; a metric it did not is left out, never shown as zero. */
function metricKpis(
  now: ReadonlyMap<string, number>,
  history: ReadonlyMap<string, HistoryPoint[]>,
  from: Date
): AnalyticsKpi[] {
  return TILES.flatMap((tile) => {
    const value = now.get(tile.metric);
    if (value === undefined) return [];
    const previous = valueAt(history.get(tile.metric), from);
    return [kpi(tile.key, value, previous, { format: tile.format, higherIsBetter: tile.higherIsBetter })];
  });
}

const pathOf = (group: SonarGroup) => group.path;

function workspaceLeaderboard(workspaces: readonly SonarGroup[]): AnalyticsLeaderboard {
  const metrics = [
    'violations',
    'software_quality_security_issues',
    'security_hotspots',
    'software_quality_reliability_issues',
    'software_quality_maintainability_issues',
    'ncloc',
  ];
  const ranked = [...workspaces]
    .sort((a, b) => measureOf(b.measures, 'violations') - measureOf(a.measures, 'violations'))
    .slice(0, TOP);
  return {
    key: 'sonar_workspaces',
    columns: ['issues', 'security_issues', 'hotspots', 'reliability_issues', 'maintainability_issues', 'lines_of_code'].map(
      (key) => ({ key, format: 'COUNT' as const })
    ),
    rows: ranked.map((group) => ({
      id: group.path,
      name: group.path,
      caption: null,
      values: metrics.map((metric) => measureOf(group.measures, metric)),
    })),
  };
}

export async function sonarAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const cfg = await requireSonarConfig();
  const metrics = TILES.map((tile) => tile.metric);
  const [now, history, failing, facets, workspaces] = await Promise.all([
    projectMeasures(cfg, metrics),
    measureHistory(cfg, metrics),
    failingGateConditions(cfg),
    openIssueFacets(cfg, ['impactSoftwareQualities', 'impactSeverities', 'rules']),
    sonarWorkspaces(cfg),
  ]);
  const rules = facets.get('rules') ?? new Map<string, number>();
  const series = (key: string, metric: string) => ({ key, values: standingSeries(history.get(metric), window) });

  return {
    kpis: [
      ...metricKpis(now, history, window.from),
      kpi('sonar_gate_failing', failing, null, { higherIsBetter: false }),
    ],
    trends: [
      trend('sonar_security', window, [
        series('sonar_security_issues', 'software_quality_security_issues'),
        series('sonar_hotspots', 'security_hotspots'),
      ]),
      trend('sonar_quality', window, [
        series('sonar_reliability_issues', 'software_quality_reliability_issues'),
        series('sonar_maintainability_issues', 'software_quality_maintainability_issues'),
      ]),
    ],
    breakdowns: [
      breakdown('sonar_issues_by_quality', fixedSlices(QUALITIES, facets.get('impactSoftwareQualities') ?? new Map()), {
        scope: 'ALL_TIME',
        ordered: true,
      }),
      breakdown('sonar_issues_by_severity', fixedSlices(SEVERITIES, facets.get('impactSeverities') ?? new Map()), {
        scope: 'ALL_TIME',
        ordered: true,
      }),
      breakdown('sonar_top_rules', rankedSlices(rules, ([rule]) => rule, ([, count]) => count), { scope: 'ALL_TIME' }),
      breakdown(
        'sonar_issues_by_area',
        rankedSlices(sonarAreas(workspaces), pathOf, (area) => measureOf(area.measures, 'violations')),
        { scope: 'ALL_TIME' }
      ),
    ],
    leaderboard: workspaceLeaderboard(workspaces),
  };
}
