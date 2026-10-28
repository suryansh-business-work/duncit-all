import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UnitTestRunModel } from '@modules/platform/unitTestRun/unitTestRun.model';
import {
  REGRESSION_KINDS,
  RegressionItemModel,
  RegressionReportModel,
  type IRegressionCounts,
  type IRegressionItem,
  type IRegressionReport,
  type RegressionKind,
} from './regressionReport.model';
import { compareUnitRuns, findUnitBase } from './regressionReport.unit';
import { compareE2eRuns, findE2eBase, isFinishedE2e, loadE2eRun } from './regressionReport.e2e';
import { pubItem, pubReport } from './regressionReport.public';

/**
 * Building and reading regression reports.
 *
 * A build NEVER throws to its caller: it runs after a run has already been
 * recorded, from the mutation that recorded it, and a comparison that fails
 * must not turn a finished run into a failed report call. Every failure is
 * logged with the run it was for.
 */

/** A BUILDING lock older than this belongs to a build that died; the next one takes over. */
const STALE_BUILD_MS = 10 * 60_000;
const PURGE_BATCH = 5;

const REPORTS_TABLE: TableEntityConfig = {
  searchFields: ['run_no', 'base_run_no', 'branch'],
  sortFields: {
    created_at: 'created_at',
    kind: 'kind',
    status: 'status',
    branch: 'branch',
    run_no: 'run_no',
    regressed: 'counts.regressed',
    fixed: 'counts.fixed',
    new_failing: 'counts.new_failing',
  },
  filterFields: {
    kind: { type: 'enum' },
    status: { type: 'enum' },
    branch: { type: 'string' },
    workflow: { type: 'enum' },
    run_no: { type: 'string' },
    created_at: { type: 'date' },
    regressed: { path: 'counts.regressed', type: 'number' },
  },
  defaultSort: { created_at: -1 },
};

const ITEMS_TABLE: TableEntityConfig = {
  searchFields: ['full_name', 'file', 'workspace'],
  sortFields: { workspace: 'workspace', file: 'file', full_name: 'full_name', bucket: 'bucket' },
  filterFields: {
    bucket: { type: 'enum' },
    workspace: { type: 'string' },
    file: { type: 'string' },
  },
  defaultSort: { workspace: 1, file: 1 },
};

const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;

/**
 * Take the build lock for one run's report. Null when a READY report already
 * exists (the build is done — idempotent) or a live build holds the lock.
 *
 * The filter excludes READY and fresh BUILDING rows, so the upsert either
 * re-takes a stale lock or inserts a new row — and inserting over an existing
 * one trips the unique (kind, run_id) index, which is the "someone else has
 * it" answer.
 */
async function claimBuild(kind: RegressionKind, runId: Types.ObjectId): Promise<IRegressionReport | null> {
  const now = new Date();
  try {
    return await RegressionReportModel.findOneAndUpdate(
      {
        kind,
        run_id: runId,
        state: { $ne: 'READY' },
        $or: [{ building_since: null }, { building_since: { $lt: new Date(now.getTime() - STALE_BUILD_MS) } }],
      },
      { $set: { state: 'BUILDING', building_since: now } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (isDuplicateKey(err)) return null;
    throw err;
  }
}

const hasRegression = (counts: IRegressionCounts): boolean => counts.regressed + counts.new_failing > 0;

/** Give up a lock without a report — there was nothing to compare against. */
async function dropClaim(report: IRegressionReport): Promise<void> {
  await RegressionReportModel.deleteOne({ _id: report._id, state: 'BUILDING' });
}

async function buildUnit(runId: string): Promise<void> {
  const run = await UnitTestRunModel.findById(runId, {
    run_no: 1,
    workflow: 1,
    branch: 1,
    status: 1,
    created_at: 1,
    workspaces: 1,
    coverage: 1,
  }).lean();
  if (!run || (run.status !== 'PASSED' && run.status !== 'FAILED')) return;
  const base = await findUnitBase(run);
  if (!base) return;
  const report = await claimBuild('UNIT', run._id);
  if (!report) return;
  try {
    const result = await compareUnitRuns(run, base);
    await RegressionItemModel.deleteMany({ report_id: report._id });
    if (result.items.length > 0) {
      await RegressionItemModel.insertMany(
        result.items.map((item) => ({ ...item, report_id: report._id })),
        { ordered: false }
      );
    }
    await RegressionReportModel.updateOne(
      { _id: report._id },
      {
        $set: {
          state: 'READY',
          building_since: null,
          status: hasRegression(result.counts) ? 'REGRESSED' : 'CLEAN',
          run_no: run.run_no,
          base_run_id: base._id,
          base_run_no: base.run_no,
          branch: run.branch,
          workflow: run.workflow,
          counts: result.counts,
          items_kept: result.items.length,
          truncated: result.truncated,
          skipped_workspaces: result.skipped_workspaces,
          coverage_total: result.coverage_total,
          coverage_workspaces: result.coverage_workspaces,
          suites: [],
          items_purged: false,
        },
      }
    );
  } catch (err) {
    await dropClaim(report);
    throw err;
  }
}

async function buildE2e(runId: string): Promise<void> {
  const run = await loadE2eRun(runId);
  if (!run || !isFinishedE2e(run)) return;
  const base = await findE2eBase(run);
  if (!base) return;
  const report = await claimBuild('E2E', run._id);
  if (!report) return;
  try {
    const result = compareE2eRuns(run, base);
    await RegressionReportModel.updateOne(
      { _id: report._id },
      {
        $set: {
          state: 'READY',
          building_since: null,
          status: hasRegression(result.counts) ? 'REGRESSED' : 'CLEAN',
          run_no: run.run_no,
          base_run_id: base._id,
          base_run_no: base.run_no,
          branch: run.ref,
          workflow: '',
          counts: result.counts,
          items_kept: 0,
          truncated: false,
          skipped_workspaces: [],
          coverage_total: null,
          coverage_workspaces: [],
          suites: result.suites,
          items_purged: false,
        },
      }
    );
  } catch (err) {
    await dropClaim(report);
    throw err;
  }
}

/** Run a build and swallow its failure into the log — see the module note. */
async function safely(kind: RegressionKind, runId: string, build: (id: string) => Promise<void>): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(runId)) return;
    await build(runId);
  } catch (error) {
    logs.server.error('regressionReport', 'build', { error, kind, run_id: runId });
  }
}

export const regressionReportService = {
  buildForUnitRun(runId: string): Promise<void> {
    return safely('UNIT', runId, buildUnit);
  },

  buildForE2eRun(runId: string): Promise<void> {
    return safely('E2E', runId, buildE2e);
  },

  async table(query?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IRegressionReport>(
      RegressionReportModel,
      { state: 'READY' },
      query,
      REPORTS_TABLE,
      { projection: { coverage_workspaces: 0, suites: 0 } }
    );
    return { rows: docs.map(pubReport), total, page, page_size };
  },

  async byId(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await RegressionReportModel.findOne({ _id: id, state: 'READY' });
    return doc ? pubReport(doc) : null;
  },

  async itemsTable(reportId: string, query?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(reportId)) return { rows: [], total: 0, page: 1, page_size: 25 };
    const { docs, total, page, page_size } = await runTableQuery<IRegressionItem>(
      RegressionItemModel,
      { report_id: new Types.ObjectId(reportId) },
      query,
      ITEMS_TABLE
    );
    return { rows: docs.map(pubItem), total, page, page_size };
  },

  /** The READY report for one run, if there is one — the run page links to it. */
  async idForRun(kind: RegressionKind, runId: string): Promise<string | null> {
    if (!Types.ObjectId.isValid(runId)) return null;
    const doc = await RegressionReportModel.findOne(
      { kind, run_id: new Types.ObjectId(runId), state: 'READY' },
      { _id: 1 }
    ).lean();
    return doc ? String(doc._id) : null;
  },

  /** For the console dashboard: the latest READY report of each kind. */
  async latestSummary() {
    const latest = await Promise.all(
      REGRESSION_KINDS.map((kind) =>
        RegressionReportModel.findOne(
          { kind, state: 'READY' },
          { kind: 1, status: 1, run_no: 1, base_run_no: 1, branch: 1, counts: 1, created_at: 1 }
        )
          .sort({ created_at: -1 })
          .lean()
      )
    );
    return latest
      .filter((doc) => doc !== null)
      .map((doc) => ({
        id: String(doc._id),
        kind: doc.kind,
        status: doc.status,
        run_no: doc.run_no,
        base_run_no: doc.base_run_no,
        branch: doc.branch,
        counts: doc.counts,
        created_at: doc.created_at.toISOString(),
      }));
  },

  /**
   * Trim the item lists of reports beyond the newest `keep` of each kind. The
   * report itself — counts, coverage, suites — stays.
   */
  async purgeOldItems(keep: number): Promise<number> {
    let purged = 0;
    for (const kind of REGRESSION_KINDS) {
      const doomed = await RegressionReportModel.find(
        { kind, state: 'READY', items_purged: false },
        { _id: 1 }
      )
        .sort({ created_at: -1 })
        .skip(Math.max(keep, 1))
        .limit(PURGE_BATCH)
        .lean();
      for (const report of doomed) {
        await RegressionItemModel.deleteMany({ report_id: report._id });
        await RegressionReportModel.updateOne({ _id: report._id }, { $set: { items_purged: true } });
      }
      purged += doomed.length;
    }
    return purged;
  },
};
