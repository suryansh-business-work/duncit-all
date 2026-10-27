import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { logs, SERVER_ENV } from '@observability/log';
import type { AuthUser } from '@context';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  dispatchWorkflow,
  githubRepoConfig,
  requireGithubRepoConfig,
  workflowRunsUrl,
} from '@utils/github-actions';
import {
  DEFAULT_RETENTION_RUNS,
  FINISHED_UNIT_RUN_STATUSES,
  LIVE_UNIT_RUN_STATUSES,
  MAX_RETENTION_RUNS,
  MIN_RETENTION_RUNS,
  UNIT_SETTINGS_KEY,
  UnitTestCaseModel,
  UnitTestFileModel,
  UnitTestRunModel,
  UnitTestSettingsModel,
  nextUnitRunNo,
  type IUnitTestCase,
  type IUnitTestFile,
  type IUnitTestRun,
  type IUnitTestSettings,
} from './unitTestRun.model';
import { badInput, requireRunId } from './unitTestRun.inputs';
import { pctOf, pubCase, pubCoverage, pubCounts, pubFile, pubRun } from './unitTestRun.public';

/** The workflow a console "Run now" dispatches. sonar.yml runs on push only. */
export const COVERAGE_WORKFLOW_FILE = 'coverage.yml';

/** The branch this environment deploys from — and so the one its runs report back from. */
const branchForEnvironment = (): string => (SERVER_ENV === 'production' ? 'main' : 'staging');

const RUNS_TABLE: TableEntityConfig = {
  searchFields: ['run_no', 'branch', 'commit_sha', 'triggered_by', 'requested_by', 'error_message'],
  // Every column the table renders sortable must be listed — resolveSort
  // silently ignores anything else.
  sortFields: {
    run_no: 'run_no',
    status: 'status',
    trigger: 'trigger',
    workflow: 'workflow',
    branch: 'branch',
    commit_sha: 'commit_sha',
    created_at: 'created_at',
    started_at: 'started_at',
    duration_ms: 'duration_ms',
    tests: 'totals.tests',
    passed: 'totals.passed',
    failed: 'totals.failed',
    skipped: 'totals.skipped',
    lines_pct: 'lines_pct',
  },
  filterFields: {
    run_no: { type: 'string' },
    status: { type: 'enum' },
    trigger: { type: 'enum' },
    workflow: { type: 'enum' },
    branch: { type: 'string' },
    commit_sha: { type: 'string' },
    created_at: { type: 'date' },
    started_at: { type: 'date' },
    duration_ms: { type: 'number' },
    tests: { path: 'totals.tests', type: 'number' },
    passed: { path: 'totals.passed', type: 'number' },
    failed: { path: 'totals.failed', type: 'number' },
    skipped: { path: 'totals.skipped', type: 'number' },
    lines_pct: { type: 'number' },
  },
  defaultSort: { created_at: -1 },
};

const CASES_TABLE: TableEntityConfig = {
  searchFields: ['title', 'full_name', 'file'],
  sortFields: {
    workspace: 'workspace',
    file: 'file',
    full_name: 'full_name',
    title: 'title',
    status: 'status',
    duration_ms: 'duration_ms',
  },
  filterFields: {
    workspace: { type: 'string' },
    file: { type: 'string' },
    full_name: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'enum' },
    duration_ms: { type: 'number' },
  },
  defaultSort: { workspace: 1, file: 1 },
};

const FILES_TABLE: TableEntityConfig = {
  searchFields: ['path', 'workspace', 'mocks', 'gql_mocks'],
  sortFields: {
    path: 'path',
    workspace: 'workspace',
    kind: 'kind',
    status: 'status',
    tests: 'tests',
    failed: 'failed',
    duration_ms: 'duration_ms',
    mock_count: 'mock_count',
  },
  filterFields: {
    path: { type: 'string' },
    workspace: { type: 'string' },
    kind: { type: 'enum' },
    status: { type: 'enum' },
    tests: { type: 'number' },
    failed: { type: 'number' },
    duration_ms: { type: 'number' },
    mock_count: { type: 'number' },
    has_mocks: { type: 'boolean' },
  },
  defaultSort: { path: 1 },
};

/** The heavy arrays a table row never shows. */
const RUN_ROW_PROJECTION = { workspaces: 0 } as const;

/** The settings singleton, created with defaults on first read. */
async function settingsDoc(): Promise<IUnitTestSettings> {
  return UnitTestSettingsModel.findOneAndUpdate(
    { key: UNIT_SETTINGS_KEY },
    { $setOnInsert: { key: UNIT_SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
}

const pubSettings = (doc: IUnitTestSettings) => ({
  retention_runs: doc.retention_runs ?? DEFAULT_RETENTION_RUNS,
  min_retention_runs: MIN_RETENTION_RUNS,
  max_retention_runs: MAX_RETENTION_RUNS,
});

/** The newest finished run that still has its files and cases. */
async function latestDetailedRun() {
  return UnitTestRunModel.findOne(
    { status: { $in: FINISHED_UNIT_RUN_STATUSES }, details_purged: false },
    { run_no: 1, finished_at: 1, branch: 1, workflow: 1, status: 1 }
  )
    .sort({ finished_at: -1 })
    .lean();
}

const runRef = (doc: Pick<IUnitTestRun, 'run_no' | 'finished_at' | 'branch' | 'workflow' | 'status'> & { _id: unknown }) => ({
  id: String(doc._id),
  run_no: doc.run_no,
  finished_at: doc.finished_at?.toISOString() ?? null,
  branch: doc.branch,
  workflow: doc.workflow,
  status: doc.status,
});

async function filesPage(runId: Types.ObjectId, query: TableQueryInput | null | undefined) {
  const { docs, total, page, page_size } = await runTableQuery<IUnitTestFile>(
    UnitTestFileModel,
    { run_id: runId },
    query,
    FILES_TABLE
  );
  return { rows: docs.map(pubFile), total, page, page_size };
}

interface CountRow {
  _id: string;
  files: number;
}

/** The most-mocked names in one list field of a run's files. */
async function topMocked(runId: Types.ObjectId, field: 'mocks' | 'gql_mocks', limit: number) {
  const rows = await UnitTestFileModel.aggregate<CountRow>([
    { $match: { run_id: runId, has_mocks: true } },
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, files: { $sum: 1 } } },
    { $sort: { files: -1, _id: 1 } },
    { $limit: limit },
  ]);
  return rows.map((row) => ({ name: row._id, files: row.files }));
}

export const unitTestRunService = {
  async table(query?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IUnitTestRun>(
      UnitTestRunModel,
      {},
      query,
      RUNS_TABLE,
      { projection: RUN_ROW_PROJECTION }
    );
    return { rows: docs.map(pubRun), total, page, page_size };
  },

  async byId(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await UnitTestRunModel.findById(id).lean();
    return doc ? pubRun(doc) : null;
  },

  async casesTable(runId: string, query?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IUnitTestCase>(
      UnitTestCaseModel,
      { run_id: requireRunId(runId) },
      query,
      CASES_TABLE
    );
    return { rows: docs.map(pubCase), total, page, page_size };
  },

  filesTable(runId: string, query?: TableQueryInput | null) {
    return filesPage(requireRunId(runId), query);
  },

  /** The latest finished run's test files — the repo's test inventory as CI last saw it. */
  async inventory(query?: TableQueryInput | null) {
    const run = await latestDetailedRun();
    if (!run) return { run: null, rows: [], total: 0, page: 1, page_size: query?.page_size ?? 25 };
    return { run: runRef(run), ...(await filesPage(run._id, query)) };
  },

  /** Files and tests per kind, and what the inventory mocks most. */
  async inventorySummary() {
    const run = await latestDetailedRun();
    if (!run) return null;
    const [kinds, withMocks, topMocks, topGqlMocks] = await Promise.all([
      UnitTestFileModel.aggregate<{ _id: string; files: number; tests: number; not_run: number }>([
        { $match: { run_id: run._id } },
        {
          $group: {
            _id: '$kind',
            files: { $sum: 1 },
            tests: { $sum: '$tests' },
            not_run: { $sum: { $cond: [{ $eq: ['$status', 'NOT_RUN'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      UnitTestFileModel.countDocuments({ run_id: run._id, has_mocks: true }),
      topMocked(run._id, 'mocks', 10),
      topMocked(run._id, 'gql_mocks', 10),
    ]);
    return {
      run: runRef(run),
      kinds: kinds.map((k) => ({ kind: k._id, files: k.files, tests: k.tests, not_run: k.not_run })),
      files_with_mocks: withMocks,
      top_mocks: topMocks,
      top_gql_mocks: topGqlMocks,
    };
  },

  /** Per-run totals, oldest first, for a chart. */
  async coverageTrend(limit?: number | null) {
    const size = Math.min(Math.max(Math.trunc(limit ?? 30), 1), 200);
    const docs = await UnitTestRunModel.find(
      { status: { $in: FINISHED_UNIT_RUN_STATUSES } },
      { run_no: 1, finished_at: 1, branch: 1, workflow: 1, status: 1, totals: 1, coverage: 1 }
    )
      .sort({ finished_at: -1 })
      .limit(size)
      .lean();
    return docs.reverse().map((doc) => ({
      ...runRef(doc),
      totals: pubCounts(doc.totals),
      coverage: pubCoverage(doc.coverage),
    }));
  },

  /**
   * For the console dashboard: the latest finished run in one cheap read —
   * its verdict, totals, and coverage overall and per workspace.
   */
  async latestSummary() {
    const doc = await UnitTestRunModel.findOne(
      { status: { $in: FINISHED_UNIT_RUN_STATUSES } },
      {
        run_no: 1,
        status: 1,
        branch: 1,
        workflow: 1,
        finished_at: 1,
        totals: 1,
        coverage: 1,
        'workspaces.name': 1,
        'workspaces.status': 1,
        'workspaces.coverage': 1,
      }
    )
      .sort({ finished_at: -1 })
      .lean();
    if (!doc) return null;
    return {
      ...runRef(doc),
      totals: pubCounts(doc.totals),
      coverage: pubCoverage(doc.coverage),
      workspaces: (doc.workspaces ?? []).map((ws) => ({
        name: ws.name,
        status: ws.status,
        coverage: pubCoverage(ws.coverage),
        lines_pct: pctOf(ws.coverage?.lines),
      })),
    };
  },

  async settings() {
    return pubSettings(await settingsDoc());
  },

  async updateSettings(input: { retention_runs: number }) {
    const runs = Number(input.retention_runs);
    if (!Number.isInteger(runs) || runs < MIN_RETENTION_RUNS || runs > MAX_RETENTION_RUNS) {
      throw badInput(`Keep between ${MIN_RETENTION_RUNS} and ${MAX_RETENTION_RUNS} runs.`);
    }
    const doc = await UnitTestSettingsModel.findOneAndUpdate(
      { key: UNIT_SETTINGS_KEY },
      { $set: { retention_runs: runs } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return pubSettings(doc);
  },

  /** Whether Run now can work from this server, and why not when it cannot. */
  async triggerConfig() {
    const [cfg, live] = await Promise.all([
      githubRepoConfig(),
      UnitTestRunModel.findOne({ trigger: 'PORTAL', status: { $in: LIVE_UNIT_RUN_STATUSES } }, { run_no: 1 }).lean(),
    ]);
    let blockedReason = '';
    if (SERVER_ENV === 'localhost') blockedReason = 'LOCAL';
    else if (!cfg) blockedReason = 'GITHUB';
    else if (live) blockedReason = 'LIVE';
    return {
      can_start: blockedReason === '',
      blocked_reason: blockedReason,
      branch: branchForEnvironment(),
      repository: cfg ? `${cfg.owner}/${cfg.repo}` : '',
      live_run_no: live?.run_no ?? null,
    };
  },

  /**
   * Run now: a QUEUED row first, then coverage.yml on this environment's
   * branch with the row's dispatch id. A refused dispatch takes the row back
   * out, so the table never shows a run GitHub did not accept.
   *
   * One console-started run at a time: coverage.yml cancels the run in flight
   * on its branch, so a second click would silently kill the first.
   */
  async start(user: AuthUser) {
    if (SERVER_ENV === 'localhost') {
      throw badInput('Unit runs cannot be started from a local server — CI reports to staging or production.');
    }
    const live = await UnitTestRunModel.findOne(
      { trigger: 'PORTAL', status: { $in: LIVE_UNIT_RUN_STATUSES } },
      { run_no: 1 }
    ).lean();
    if (live) throw badInput(`${live.run_no} is still running. Wait for it to finish first.`);
    const cfg = await requireGithubRepoConfig();
    const branch = branchForEnvironment();
    const dispatchId = randomUUID();
    const who = user.email ?? user.id;
    const run = await UnitTestRunModel.create({
      run_no: await nextUnitRunNo(),
      status: 'QUEUED',
      trigger: 'PORTAL',
      workflow: 'COVERAGE',
      branch,
      requested_by: who,
      triggered_by: who,
      dispatch_id: dispatchId,
    });
    try {
      await dispatchWorkflow(cfg, COVERAGE_WORKFLOW_FILE, branch, { dispatch_id: dispatchId });
    } catch (err) {
      await UnitTestRunModel.deleteOne({ _id: run._id });
      throw err;
    }
    logs.server.info('unitTestRun', 'start', { userId: user.id, run_no: run.run_no, branch });
    return { run: pubRun(run), actions_url: workflowRunsUrl(cfg, COVERAGE_WORKFLOW_FILE, branch) };
  },
};
