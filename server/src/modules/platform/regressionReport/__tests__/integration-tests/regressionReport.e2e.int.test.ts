/**
 * The E2E regression report against a real database: once both runs reported
 * their scenarios it compares them one by one (bucket counts and item rows),
 * only inside suites both runs judged; runs without scenario rows keep the
 * suite-by-suite comparison.
 */
import { Types } from 'mongoose';
import {
  E2eRunModel,
  E2eScenarioResultModel,
  type E2eScenarioState,
} from '@modules/platform/e2eRun/e2eRun.model';
import { RegressionItemModel, RegressionReportModel } from '../../regressionReport.model';
import { regressionReportService } from '../../regressionReport.service';

const HOUR_MS = 60 * 60 * 1000;

interface SuiteSeed {
  key: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'RUNNING';
}

async function createRun(runNo: string, hoursAgo: number, results: SuiteSeed[], status = 'FAILED') {
  const run = await E2eRunModel.create({
    run_no: runNo,
    status,
    ref: 'staging',
    results,
    created_at: new Date(Date.now() - hoursAgo * HOUR_MS),
  });
  return run._id as Types.ObjectId;
}

async function addScenario(runId: Types.ObjectId, suite: string, title: string, state: E2eScenarioState, error = '') {
  await E2eScenarioResultModel.create({
    run_id: runId,
    case_key: `${suite}:${title}`,
    suite,
    project: 'mweb',
    spec: `${suite}.cy.ts`,
    spec_key: `mweb/${suite}.cy.ts`,
    title_path: [suite, title],
    title,
    state,
    error,
  });
}

const itemsOf = async (runId: Types.ObjectId) => {
  const report = await RegressionReportModel.findOne({ kind: 'E2E', run_id: runId }).lean();
  const items = await RegressionItemModel.find({ report_id: report?._id }).sort({ title: 1 }).lean();
  return { report, items };
};

describe('regressionReportService.buildForE2eRun', () => {
  it('compares scenario by scenario inside the suites both runs judged', async () => {
    const baseId = await createRun('DUN-E2E-000101', 2, [
      { key: 'accounts', status: 'FAILED' },
      { key: 'pods', status: 'PASSED' },
    ]);
    await addScenario(baseId, 'accounts', 'a breaks', 'PASSED');
    await addScenario(baseId, 'accounts', 'b heals', 'FAILED', 'was broken');
    await addScenario(baseId, 'accounts', 'c stays red', 'FAILED', 'old failure');
    await addScenario(baseId, 'accounts', 'f is deleted', 'FAILED', 'gone');
    await addScenario(baseId, 'accounts', 'g gets blocked', 'PASSED');
    await addScenario(baseId, 'accounts', 'h stays green', 'PASSED');
    await addScenario(baseId, 'pods', 'p only before', 'PASSED');

    const runId = await createRun('DUN-E2E-000102', 1, [
      { key: 'accounts', status: 'FAILED' },
      { key: 'pods', status: 'SKIPPED' },
    ]);
    await addScenario(runId, 'accounts', 'a breaks', 'FAILED', 'expected 200, got 500\n at spec');
    await addScenario(runId, 'accounts', 'b heals', 'PASSED');
    await addScenario(runId, 'accounts', 'c stays red', 'FAILED', 'new failure');
    await addScenario(runId, 'accounts', 'd new and red', 'FAILED', 'never worked');
    await addScenario(runId, 'accounts', 'e new and green', 'PASSED');
    await addScenario(runId, 'accounts', 'g gets blocked', 'SKIPPED');
    await addScenario(runId, 'accounts', 'h stays green', 'PASSED');
    await addScenario(runId, 'pods', 'p only now', 'FAILED', 'not judged');

    await regressionReportService.buildForE2eRun(String(runId));

    const { report, items } = await itemsOf(runId);
    expect(report).toMatchObject({
      state: 'READY',
      status: 'REGRESSED',
      run_no: 'DUN-E2E-000102',
      base_run_no: 'DUN-E2E-000101',
      items_kept: 6,
      truncated: false,
      skipped_workspaces: ['pods'],
      counts: { regressed: 1, fixed: 1, still_failing: 1, new_failing: 1, new_tests: 1, removed_tests: 1 },
    });
    // The suite view is still there beside the scenarios.
    expect(report?.suites.map((s) => s.suite)).toEqual(['accounts', 'pods']);
    expect(items.map((i) => [i.title, i.bucket])).toEqual([
      ['a breaks', 'REGRESSED'],
      ['b heals', 'FIXED'],
      ['c stays red', 'STILL_FAILING'],
      ['d new and red', 'NEW_FAILING'],
      ['e new and green', 'NEW_TESTS'],
      ['f is deleted', 'REMOVED_TESTS'],
    ]);
    expect(items[0]).toMatchObject({
      workspace: 'accounts',
      file: 'mweb/accounts.cy.ts',
      full_name: 'accounts › a breaks',
      failure_message: 'expected 200, got 500\n at spec',
    });
    // A passing or removed scenario carries no failure text.
    expect(items[1].failure_message).toBe('');
    expect(items[5].failure_message).toBe('');
  });

  it('is CLEAN when nothing that passed now fails and nothing new fails', async () => {
    const baseId = await createRun('DUN-E2E-000111', 2, [{ key: 'accounts', status: 'FAILED' }]);
    await addScenario(baseId, 'accounts', 'x', 'FAILED', 'broken');
    await addScenario(baseId, 'accounts', 'y', 'PASSED');
    const runId = await createRun('DUN-E2E-000112', 1, [{ key: 'accounts', status: 'FAILED' }]);
    await addScenario(runId, 'accounts', 'x', 'FAILED', 'still broken');
    await addScenario(runId, 'accounts', 'y', 'PASSED');

    await regressionReportService.buildForE2eRun(String(runId));

    const { report, items } = await itemsOf(runId);
    expect(report?.status).toBe('CLEAN');
    expect(report?.counts).toMatchObject({ regressed: 0, still_failing: 1, new_failing: 0 });
    expect(items).toHaveLength(1);
  });

  it('falls back to suite counts when the baseline reported no scenarios', async () => {
    await createRun('DUN-E2E-000121', 2, [
      { key: 'accounts', status: 'PASSED' },
      { key: 'pods', status: 'FAILED' },
    ]);
    const runId = await createRun('DUN-E2E-000122', 1, [
      { key: 'accounts', status: 'FAILED' },
      { key: 'pods', status: 'FAILED' },
    ]);
    await addScenario(runId, 'accounts', 'a', 'FAILED', 'boom');

    await regressionReportService.buildForE2eRun(String(runId));

    const { report, items } = await itemsOf(runId);
    expect(report).toMatchObject({
      status: 'REGRESSED',
      items_kept: 0,
      skipped_workspaces: [],
      counts: { regressed: 1, still_failing: 1, new_failing: 0, new_tests: 0 },
    });
    expect(items).toHaveLength(0);
  });

  it('builds once per run: a second build neither duplicates the report nor its items', async () => {
    const baseId = await createRun('DUN-E2E-000131', 2, [{ key: 'accounts', status: 'PASSED' }]);
    await addScenario(baseId, 'accounts', 'a', 'PASSED');
    const runId = await createRun('DUN-E2E-000132', 1, [{ key: 'accounts', status: 'FAILED' }]);
    await addScenario(runId, 'accounts', 'a', 'FAILED', 'boom');

    await regressionReportService.buildForE2eRun(String(runId));
    await regressionReportService.buildForE2eRun(String(runId));

    expect(await RegressionReportModel.countDocuments({ run_id: runId })).toBe(1);
    const { report, items } = await itemsOf(runId);
    expect(items).toHaveLength(1);
    expect(await regressionReportService.idForRun('E2E', String(runId))).toBe(String(report?._id));
  });

  it('builds nothing for a run that has not finished', async () => {
    const baseId = await createRun('DUN-E2E-000141', 2, [{ key: 'accounts', status: 'PASSED' }]);
    await addScenario(baseId, 'accounts', 'a', 'PASSED');
    const runId = await createRun('DUN-E2E-000142', 1, [{ key: 'accounts', status: 'RUNNING' }], 'RUNNING');

    await regressionReportService.buildForE2eRun(String(runId));

    expect(await RegressionReportModel.countDocuments()).toBe(0);
  });
});
