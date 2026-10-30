import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { badInput, caseKey, cleanText, count, requireRows, str } from '@modules/platform/unitTestRun/unitTestRun.inputs';
import { E2eScenarioResultModel, type E2eScenarioState, type IE2eScenarioResult } from './e2eRun.model';
import { openRowFor, type E2eRunJoinKeys } from './e2eRun.lookup';

/**
 * Every scenario a run held, as CI read it out of Cypress — the Tests console's
 * scenario list. The run row keeps the suite counts; this keeps the tests.
 */

const MAX_ERROR_CHARS = 4000;
const MAX_TITLE_CHARS = 1000;
const MAX_PATH_CHARS = 1000;
const MAX_TITLE_DEPTH = 20;

export interface E2eScenarioInput {
  project?: string | null;
  spec: string;
  /** 0 for the first test a spec titles this way, 1 for the second, and so on. */
  ordinal?: number | null;
  title_path: string[];
  state: E2eScenarioState;
  duration_ms?: number | null;
  error?: string | null;
}

export interface ReportE2eScenariosInput extends E2eRunJoinKeys {
  suite: string;
  /** Drop the leg's earlier rows first — the first chunk of a report sends it. */
  reset?: boolean | null;
  scenarios: E2eScenarioInput[];
}

const SCENARIOS_TABLE: TableEntityConfig = {
  searchFields: ['title', 'title_path', 'spec', 'error'],
  // Every column the table renders sortable must be listed — resolveSort
  // silently ignores anything else.
  sortFields: {
    project: 'project',
    spec: 'spec',
    title: 'title',
    state: 'state',
    duration_ms: 'duration_ms',
  },
  filterFields: {
    project: { type: 'string' },
    spec: { type: 'string' },
    title: { type: 'string' },
    state: { type: 'enum' },
    duration_ms: { type: 'number' },
  },
  defaultSort: { project: 1, spec: 1 },
};

function cleanScenario(suite: string, s: E2eScenarioInput) {
  const project = cleanText(s.project, MAX_TITLE_CHARS).trim();
  const spec = cleanText(s.spec, MAX_PATH_CHARS).trim();
  if (!spec) throw badInput('Every scenario needs its spec file.');
  const titlePath = (s.title_path ?? []).slice(0, MAX_TITLE_DEPTH).map((t) => cleanText(t, MAX_TITLE_CHARS));
  const duration = s.duration_ms;
  return {
    case_key: caseKey(`${suite}\u0000${project}`, spec, titlePath.join('\u0000'), count(s.ordinal)),
    suite,
    project,
    spec,
    spec_key: `${project}/${spec}`,
    title_path: titlePath,
    title: titlePath.at(-1) ?? '',
    state: s.state,
    duration_ms: typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null,
    error: s.state === 'FAILED' ? cleanText(s.error, MAX_ERROR_CHARS) : '',
  };
}

const pubScenario = (doc: IE2eScenarioResult) => ({
  id: String(doc._id),
  suite: doc.suite,
  project: doc.project,
  spec: doc.spec,
  title_path: doc.title_path,
  title: doc.title,
  state: doc.state,
  duration_ms: doc.duration_ms,
  error: doc.error,
});

export const e2eScenarioService = {
  /**
   * One chunk of a leg's scenarios, upserted on (run, case_key), so a retried
   * chunk writes the same rows again. Answers how many were written.
   */
  async report(input: ReportE2eScenariosInput): Promise<number> {
    const run = await openRowFor(input);
    if (!run) throw badInput('No e2e run matches this dispatch or workflow run. Call startE2eRun first.');
    const suite = str(input.suite);
    if (!suite) throw badInput('Scenarios need the suite that ran them.');
    const rows = requireRows(input.scenarios, 'scenarios').map((s) => cleanScenario(suite, s));
    // A re-run job sends the leg again from its first chunk; without the reset,
    // a scenario the earlier attempt had and this one dropped would linger.
    if (input.reset) await E2eScenarioResultModel.deleteMany({ run_id: run._id, suite });
    if (rows.length === 0) return 0;
    await E2eScenarioResultModel.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { run_id: run._id, case_key: row.case_key },
          update: { $set: { ...row, run_id: run._id } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    return rows.length;
  },

  async table(runId: string, query?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(runId)) throw badInput('run_id is not an e2e run id.');
    const { docs, total, page, page_size } = await runTableQuery<IE2eScenarioResult>(
      E2eScenarioResultModel,
      { run_id: new Types.ObjectId(runId) },
      query,
      SCENARIOS_TABLE
    );
    return { rows: docs.map(pubScenario), total, page, page_size };
  },

  /** A deleted run's scenarios go with it — nothing else can find them. */
  async forget(runIds: readonly unknown[]): Promise<void> {
    if (runIds.length === 0) return;
    await E2eScenarioResultModel.deleteMany({ run_id: { $in: runIds } });
  },
};
