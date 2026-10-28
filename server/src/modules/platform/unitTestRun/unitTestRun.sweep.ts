/**
 * The unit runs' housekeeping, on one cluster-wide tick:
 *
 *  - a QUEUED row GitHub never started, or a RUNNING row whose workflow went
 *    quiet, is closed as CANCELLED with the reason — nothing else would ever
 *    close it, and a row that spins forever reads as "still going";
 *  - finished runs beyond the retention setting lose their files and test
 *    cases (tens of thousands of rows a run); the run summary stays, because
 *    the history and the trend read it;
 *  - the regression reports' item lists are trimmed on the same beat.
 *
 * Deletes are bounded per tick so a first sweep over a long history cannot
 * hold the database for minutes. No-ops under NODE_ENV=test (startClusterJob).
 */
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { regressionReportService } from '@modules/platform/regressionReport/regressionReport.service';
import {
  DEFAULT_RETENTION_RUNS,
  LIVE_UNIT_RUN_STATUSES,
  UNIT_SETTINGS_KEY,
  UnitTestCaseModel,
  UnitTestFileModel,
  UnitTestRunModel,
  UnitTestSettingsModel,
} from './unitTestRun.model';

const TICK_MS = 5 * 60_000;
const FIRST_TICK_DELAY_MS = 3 * 60_000;

/**
 * GitHub can hold a dispatched run in its queue while runners are busy, so a
 * QUEUED row gets two hours. A RUNNING row gets four: the longest coverage job
 * is time-boxed at 75 minutes and the report follows it, so a run still silent
 * after four hours has no runner left.
 */
const QUEUED_TIMEOUT_MS = 2 * 60 * 60_000;
const RUNNING_TIMEOUT_MS = 4 * 60 * 60_000;

/** Runs whose detail is pruned per tick. */
const PURGE_BATCH = 5;

export async function timeOutStuckRuns(now: Date = new Date()): Promise<number> {
  const queued = await UnitTestRunModel.updateMany(
    { status: 'QUEUED', created_at: { $lt: new Date(now.getTime() - QUEUED_TIMEOUT_MS) } },
    {
      $set: {
        status: 'CANCELLED',
        finished_at: now,
        error_message: 'GitHub never started this run — it was refused after queueing, or cancelled before a runner took it.',
      },
    }
  );
  const running = await UnitTestRunModel.updateMany(
    {
      status: 'RUNNING',
      $or: [
        { started_at: { $lt: new Date(now.getTime() - RUNNING_TIMEOUT_MS) } },
        { started_at: null, created_at: { $lt: new Date(now.getTime() - RUNNING_TIMEOUT_MS) } },
      ],
    },
    {
      $set: {
        status: 'CANCELLED',
        finished_at: now,
        error_message: 'No result arrived — the workflow was cancelled, or its runner died before reporting.',
      },
    }
  );
  return queued.modifiedCount + running.modifiedCount;
}

/** Prune the files and cases of runs beyond the retention setting. */
export async function purgeOldDetails(keep: number): Promise<number> {
  const doomed = await UnitTestRunModel.find(
    { status: { $nin: LIVE_UNIT_RUN_STATUSES }, details_purged: false },
    { _id: 1, run_no: 1 }
  )
    .sort({ created_at: -1 })
    .skip(keep)
    .limit(PURGE_BATCH)
    .lean();
  for (const run of doomed) {
    await UnitTestCaseModel.deleteMany({ run_id: run._id });
    await UnitTestFileModel.deleteMany({ run_id: run._id });
    await UnitTestRunModel.updateOne({ _id: run._id }, { $set: { details_purged: true } });
  }
  if (doomed.length > 0) {
    logs.server.info('unitTestRun', 'purgeDetails', { runs: doomed.map((run) => run.run_no) });
  }
  return doomed.length;
}

async function sweep(): Promise<void> {
  const timedOut = await timeOutStuckRuns();
  if (timedOut > 0) logs.server.warn('unitTestRun', 'timeOut', { runs: timedOut });
  const settings = await UnitTestSettingsModel.findOne({ key: UNIT_SETTINGS_KEY }, { retention_runs: 1 }).lean();
  const keep = settings?.retention_runs ?? DEFAULT_RETENTION_RUNS;
  await purgeOldDetails(keep);
  await regressionReportService.purgeOldItems(keep);
}

/** Start the unit-run sweeper. Returns a stop function. */
export function startUnitTestRunSweeper(): () => void {
  return startClusterJob({
    component: 'unit-test-run-sweeper',
    operation: 'sweep',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: sweep,
  });
}
