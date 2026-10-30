import { E2eScenarioResultModel } from '@modules/platform/e2eRun/e2eRun.model';
import { E2E_FLOW_SPEC_LINKS } from './catalogue/spec-links';

/** How a flow's specs did across the E2E runs still on record. */
export interface E2eFlowRunStats {
  /** Runs in which at least one of its specs ran. */
  runs: number;
  /** Runs in which every scenario of its specs passed. */
  passed: number;
  /** Runs in which any scenario of its specs failed or never ran. */
  failed: number;
}

const nameKey = (name: string) => name.trim().toLowerCase();
const LINKS = new Map(Object.entries(E2E_FLOW_SPEC_LINKS).map(([flow, specs]) => [nameKey(flow), specs]));

/** The spec files that test a flow, matched by name; empty when nothing does yet. */
export const specsForFlow = (name: string): readonly string[] => LINKS.get(nameKey(name)) ?? [];

/** Not passed: a failure, or a scenario a failed hook kept from running. */
const NOT_PASSED = ['FAILED', 'SKIPPED'];

interface RunSpecRow {
  _id: { run: unknown; spec: string };
  bad: number;
}

/**
 * Run counts for each named flow, in one aggregation over the scenario rows of
 * every spec those flows link to. A flow with no linked spec maps to null —
 * "no automated test", which is a different fact from "never failed".
 */
export async function flowRunStats(names: readonly string[]): Promise<Map<string, E2eFlowRunStats | null>> {
  const stats = new Map<string, E2eFlowRunStats | null>();
  const keys = [...new Set(names.flatMap(specsForFlow))];
  if (keys.length === 0) {
    for (const name of names) stats.set(name, null);
    return stats;
  }
  const rows = await E2eScenarioResultModel.aggregate<RunSpecRow>([
    { $match: { spec_key: { $in: keys } } },
    {
      $group: {
        _id: { run: '$run_id', spec: '$spec_key' },
        bad: { $sum: { $cond: [{ $in: ['$state', NOT_PASSED] }, 1, 0] } },
      },
    },
  ]);
  const bySpec = indexBySpec(rows);
  for (const name of names) {
    const specs = specsForFlow(name);
    stats.set(name, specs.length === 0 ? null : statsOf(specs, bySpec));
  }
  return stats;
}

/** spec -> run -> whether that run had anything not passed in that spec. */
function indexBySpec(rows: readonly RunSpecRow[]): Map<string, Map<string, boolean>> {
  const bySpec = new Map<string, Map<string, boolean>>();
  for (const row of rows) {
    const runs = bySpec.get(row._id.spec) ?? new Map<string, boolean>();
    runs.set(String(row._id.run), row.bad > 0);
    bySpec.set(row._id.spec, runs);
  }
  return bySpec;
}

/** A run fails the flow when any of its specs had anything not passed in that run. */
function statsOf(specs: readonly string[], bySpec: Map<string, Map<string, boolean>>): E2eFlowRunStats {
  const failedIn = new Map<string, boolean>();
  for (const spec of specs) {
    for (const [run, bad] of bySpec.get(spec) ?? []) failedIn.set(run, failedIn.get(run) === true || bad);
  }
  const failed = [...failedIn.values()].filter(Boolean).length;
  return { runs: failedIn.size, passed: failedIn.size - failed, failed };
}
