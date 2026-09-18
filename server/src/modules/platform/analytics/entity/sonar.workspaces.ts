import { measureMap, sonarGet, type SonarConfig, type SonarMeasure } from '@utils/sonarqube';
import { pct } from './shapes';

/**
 * SonarQube's measures per workspace (`server`, `portals/tech`,
 * `packages/utils`) and per area (`portals`, `packages`).
 *
 * Only measures that ADD UP are read, so a workspace SonarQube split into
 * several directories sums correctly, and every percentage is recomputed from
 * the sums rather than averaged.
 */

/** The directories that hold workspaces rather than being one — mirrors pnpm-workspace.yaml. */
const WORKSPACE_PARENTS = new Set(['app', 'packages', 'portals', 'website']);

const WORKSPACE_METRICS = [
  'ncloc',
  'violations',
  'software_quality_security_issues',
  'security_hotspots',
  'software_quality_reliability_issues',
  'software_quality_maintainability_issues',
  'lines_to_cover',
  'uncovered_lines',
  'conditions_to_cover',
  'uncovered_conditions',
];

interface TreeResponse {
  components: Array<{ key: string; path: string; measures: SonarMeasure[] }>;
}

export interface SonarGroup {
  path: string;
  measures: Map<string, number>;
}

const childDirs = async (cfg: SonarConfig, component: string) =>
  (
    await sonarGet<TreeResponse>(cfg, '/api/measures/component_tree', {
      component,
      strategy: 'children',
      qualifiers: 'DIR',
      metricKeys: WORKSPACE_METRICS.join(','),
      ps: 500,
    })
  ).components;

/** The workspace a directory belongs to, or null for a parent that holds several. */
function workspaceOf(path: string): string | null {
  const [first, second] = path.split('/');
  if (!WORKSPACE_PARENTS.has(first)) return first;
  return second ? `${first}/${second}` : null;
}

function sumInto(totals: Map<string, Map<string, number>>, group: string, measures: ReadonlyMap<string, number>) {
  const sums = totals.get(group) ?? new Map<string, number>();
  for (const [metric, value] of measures) sums.set(metric, (sums.get(metric) ?? 0) + value);
  totals.set(group, sums);
}

const asGroups = (totals: Map<string, Map<string, number>>): SonarGroup[] =>
  [...totals.entries()].map(([path, measures]) => ({ path, measures }));

export async function sonarWorkspaces(cfg: SonarConfig): Promise<SonarGroup[]> {
  const top = await childDirs(cfg, cfg.projectKey);
  const parents = top.filter((dir) => workspaceOf(dir.path) === null);
  const nested = await Promise.all(parents.map((dir) => childDirs(cfg, dir.key)));
  const totals = new Map<string, Map<string, number>>();
  for (const dir of [...top, ...nested.flat()]) {
    const workspace = workspaceOf(dir.path);
    if (workspace) sumInto(totals, workspace, measureMap(dir.measures));
  }
  return asGroups(totals);
}

/** Workspaces rolled up to their first directory — `portals`, `packages`, `server`. */
export function sonarAreas(workspaces: readonly SonarGroup[]): SonarGroup[] {
  const totals = new Map<string, Map<string, number>>();
  for (const workspace of workspaces) sumInto(totals, workspace.path.split('/')[0], workspace.measures);
  return asGroups(totals);
}

/** One summed measure; a metric SonarQube has no value for counts as zero. */
export const measureOf = (measures: ReadonlyMap<string, number>, metric: string) => measures.get(metric) ?? 0;

/** Line coverage from the sums. */
export const lineCoverage = (m: ReadonlyMap<string, number>) =>
  pct(measureOf(m, 'lines_to_cover') - measureOf(m, 'uncovered_lines'), measureOf(m, 'lines_to_cover'));

/** Branch coverage from the sums. */
export const branchCoverage = (m: ReadonlyMap<string, number>) =>
  pct(measureOf(m, 'conditions_to_cover') - measureOf(m, 'uncovered_conditions'), measureOf(m, 'conditions_to_cover'));

/** SonarQube's own coverage: lines and branches together. */
export function overallCoverage(m: ReadonlyMap<string, number>): number {
  const toCover = measureOf(m, 'lines_to_cover') + measureOf(m, 'conditions_to_cover');
  const uncovered = measureOf(m, 'uncovered_lines') + measureOf(m, 'uncovered_conditions');
  return pct(toCover - uncovered, toCover);
}

