import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { regressionReportService } from '@modules/platform/regressionReport/regressionReport.service';
import {
  UnitTestCaseModel,
  UnitTestFileModel,
  UnitTestRunModel,
  nextUnitRunNo,
  type IUnitTestRun,
  type IUnitTestWorkspace,
  type UnitTestRunStatus,
} from './unitTestRun.model';
import {
  badInput,
  cleanCase,
  cleanFile,
  cleanText,
  cleanWorkspace,
  count,
  requireRows,
  requireRunId,
  str,
  type ClaimUnitTestRunInput,
  type FinishUnitTestRunInput,
  type ReportUnitTestCasesInput,
  type ReportUnitTestFilesInput,
  type ReportUnitTestWorkspacesInput,
} from './unitTestRun.inputs';
import { pctOf, totalsOf } from './unitTestRun.public';

/**
 * What CI tells us, in the order it tells us: claim → workspaces → files →
 * cases → finish.
 *
 * Every write is idempotent, because the reporter retries through a server
 * that is restarting and a re-run job sends everything again: the claim lands
 * on one row per GitHub run attempt, files and cases are upserted on a key that
 * is the same every time they are sent, and the finish recomputes the totals
 * from what is stored rather than adding to them.
 */

/** What a finish may close a run as. */
const CLOSING_STATUSES: ReadonlySet<UnitTestRunStatus> = new Set(['PASSED', 'FAILED', 'CANCELLED']);

/** Mongo's duplicate-key error — two claims racing for the same new row. */
const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;

async function requireRun(id: Types.ObjectId): Promise<IUnitTestRun> {
  const run = await UnitTestRunModel.findById(id);
  if (!run) throw badInput('No unit test run has this id. Call claimUnitTestRun first.');
  return run;
}

/** The fields a claim sets on whichever row it lands on. */
function claimFields(input: ClaimUnitTestRunInput, reportedBy: string) {
  return {
    status: 'RUNNING' as UnitTestRunStatus,
    workflow: input.workflow,
    github_run_id: str(input.github_run_id),
    github_run_attempt: Math.max(1, count(input.github_run_attempt)),
    github_run_url: str(input.github_run_url),
    branch: str(input.branch),
    commit_sha: str(input.commit_sha),
    reported_by: reportedBy,
  };
}

/**
 * A dispatched run's QUEUED row, if this is the first attempt to claim it.
 * Matching on an empty run id is what keeps a re-run attempt (same dispatch,
 * attempt 2) from taking over the first attempt's row.
 */
async function claimDispatched(input: ClaimUnitTestRunInput, reportedBy: string): Promise<IUnitTestRun | null> {
  const dispatchId = str(input.dispatch_id);
  if (!dispatchId) return null;
  return UnitTestRunModel.findOneAndUpdate(
    { dispatch_id: dispatchId, github_run_id: '' },
    { $set: { ...claimFields(input, reportedBy), started_at: new Date(), error_message: '' } },
    { new: true }
  );
}

async function createClaimed(input: ClaimUnitTestRunInput, reportedBy: string): Promise<IUnitTestRun> {
  const fields = claimFields(input, reportedBy);
  const key = {
    workflow: fields.workflow,
    github_run_id: fields.github_run_id,
    github_run_attempt: fields.github_run_attempt,
  };
  try {
    const created = await UnitTestRunModel.findOneAndUpdate(
      key,
      {
        $setOnInsert: {
          ...fields,
          run_no: await nextUnitRunNo(),
          trigger: input.trigger ?? 'MANUAL',
          triggered_by: str(input.triggered_by),
          dispatch_id: str(input.dispatch_id),
          started_at: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return created;
  } catch (err) {
    // The other claim won the insert; its row is this run's row.
    if (!isDuplicateKey(err)) throw err;
    const existing = await UnitTestRunModel.findOne(key);
    if (!existing) throw err;
    return existing;
  }
}

/** A workspace that makes the run red: a failing test, or no results at all. */
const isRed = (ws: IUnitTestWorkspace): boolean => ws.status === 'FAILED' || ws.status === 'ERROR' || ws.failed > 0;

/** The run's verdict when the reporter did not give one. */
function derivedStatus(workspaces: readonly IUnitTestWorkspace[]): Extract<UnitTestRunStatus, 'PASSED' | 'FAILED'> {
  if (workspaces.length === 0) return 'FAILED';
  return workspaces.some(isRed) ? 'FAILED' : 'PASSED';
}

function derivedError(status: UnitTestRunStatus, workspaces: readonly IUnitTestWorkspace[], given: string): string {
  if (given) return given;
  if (status !== 'FAILED') return '';
  if (workspaces.length === 0) return 'No workspace reported any results.';
  const red = workspaces.filter(isRed).map((ws) => ws.name);
  const more = red.length > 10 ? ` and ${red.length - 10} more` : '';
  return `Red or broken: ${red.slice(0, 10).join(', ')}${more}.`;
}

export const unitTestRunReporting = {
  /**
   * Open (or find) the row this workflow run reports into. Answers the SAME
   * row however many times it is called for one attempt: the start job and the
   * report job both claim, and either may be the first to reach the server.
   */
  async claim(input: ClaimUnitTestRunInput, reportedBy: string): Promise<IUnitTestRun> {
    if (!str(input.github_run_id)) throw badInput('github_run_id is required.');
    const attempt = Math.max(1, count(input.github_run_attempt));
    const existing = await UnitTestRunModel.findOne({
      workflow: input.workflow,
      github_run_id: str(input.github_run_id),
      github_run_attempt: attempt,
    });
    if (existing) {
      // A row the sweeper gave up on comes back to life when its run reports.
      if (existing.status === 'CANCELLED' || existing.status === 'QUEUED') {
        existing.status = 'RUNNING';
        await existing.save();
      }
      return existing;
    }
    const dispatched = await claimDispatched(input, reportedBy);
    if (dispatched) return dispatched;
    return createClaimed(input, reportedBy);
  },

  /**
   * Each workspace's summary, replacing whatever that workspace said before.
   * `$pull` then `$push`, like the E2E legs, so a second reporter can never
   * erase a workspace it did not send.
   */
  async workspaces(input: ReportUnitTestWorkspacesInput): Promise<number> {
    const runId = requireRunId(input.run_id);
    await requireRun(runId);
    const rows = requireRows(input.workspaces, 'workspaces').map(cleanWorkspace);
    if (rows.length === 0) return 0;
    const names = rows.map((row) => row.name);
    await UnitTestRunModel.updateOne({ _id: runId }, { $pull: { workspaces: { name: { $in: names } } } });
    await UnitTestRunModel.updateOne({ _id: runId }, { $push: { workspaces: { $each: rows } } });
    return rows.length;
  },

  /** One chunk of the file inventory, upserted on (run, workspace, path). */
  async files(input: ReportUnitTestFilesInput): Promise<number> {
    const runId = requireRunId(input.run_id);
    await requireRun(runId);
    const rows = requireRows(input.files, 'files').map(cleanFile);
    if (rows.length === 0) return 0;
    const ops = rows.map((row) => ({
      updateOne: {
        filter: { run_id: runId, workspace: row.workspace, path: row.path },
        update: { $set: { ...row, run_id: runId } },
        upsert: true,
      },
    }));
    await UnitTestFileModel.bulkWrite(ops, { ordered: false });
    return rows.length;
  },

  /** One chunk of test cases, upserted on (run, case_key). */
  async cases(input: ReportUnitTestCasesInput): Promise<number> {
    const runId = requireRunId(input.run_id);
    await requireRun(runId);
    const rows = requireRows(input.cases, 'test cases').map(cleanCase);
    if (rows.length === 0) return 0;
    const ops = rows.map((row) => ({
      updateOne: {
        filter: { run_id: runId, case_key: row.case_key },
        update: { $set: { ...row, run_id: runId } },
        upsert: true,
      },
    }));
    await UnitTestCaseModel.bulkWrite(ops, { ordered: false });
    return rows.length;
  },

  /**
   * Close the run: totals summed from the stored workspaces, the verdict, and —
   * for a run that actually finished — its regression report, built in the
   * background so a slow comparison never holds the reporter.
   */
  async finish(input: FinishUnitTestRunInput, reportedBy: string): Promise<IUnitTestRun> {
    const runId = requireRunId(input.run_id);
    if (input.status && !CLOSING_STATUSES.has(input.status)) {
      throw badInput('A run can only be finished as PASSED, FAILED or CANCELLED.');
    }
    const run = await requireRun(runId);
    const { totals, coverage } = totalsOf(run.workspaces);
    const status = input.status ?? derivedStatus(run.workspaces);
    const finishedAt = new Date();
    const wallClock = run.started_at ? finishedAt.getTime() - run.started_at.getTime() : null;
    run.set({
      status,
      totals,
      coverage,
      lines_pct: pctOf(coverage.lines),
      finished_at: finishedAt,
      duration_ms: input.duration_ms == null ? wallClock : count(input.duration_ms),
      error_message: derivedError(status, run.workspaces, cleanText(input.error_message, 2000).trim()),
      reported_by: reportedBy,
    });
    await run.save();
    logs.server.info('unitTestRun', 'finish', { run_no: run.run_no, status, tests: totals.tests, failed: totals.failed });
    if (status === 'PASSED' || status === 'FAILED') {
      // Never awaited and never thrown: the report is a reading of the run,
      // and the run is already recorded.
      regressionReportService
        .buildForUnitRun(String(run._id))
        .catch((error) => logs.server.error('unitTestRun', 'regressionReport', { run_no: run.run_no, error }));
    }
    return run;
  },
};
