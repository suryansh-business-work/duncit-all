import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { refreshPayoutStatus } from '@modules/finance/payout/payout.refresh';
import { isPayoutConfigured } from '@modules/finance/payout/razorpayX.gateway';
import { SYSTEM_ACTOR } from '@modules/finance/payout/payout.audit';
import { todayKey } from '@modules/hr/employee/employee.events';
import { HrPayrollLineModel, HrPayrollRunModel, type IPayrollLine, type IPayrollRun } from './payroll.model';
import { payrollSettingsService } from './payroll.settings';
import { payrollRunService } from './payroll.service';
import { dispatchRun } from './payroll.release';
import { SCHEDULER_ACTOR } from './payroll.history';
import { notifyRunDrafted } from './payroll.notify';
import { monthsDueForDraft } from './payroll.rules';

const SWEEP_INTERVAL_MS = 60 * 60_000;
const FIRST_SWEEP_DELAY_MS = 7 * 60_000;
/** A payout still in flight this long after it was sent is asked about, in case its webhook never came. */
const STALE_PAYOUT_MS = 2 * 60 * 60_000;
const REFRESH_BATCH = 50;

/** Draft the months whose drafting window is open and that have no run yet. Off unless HR switched it on. */
export async function draftDueRuns(today = todayKey()): Promise<string[]> {
  const settings = await payrollSettingsService.get();
  if (!settings.scheduler_enabled) return [];
  const drafted: string[] = [];
  for (const month of monthsDueForDraft(today, settings)) {
    if (await HrPayrollRunModel.exists({ month, live: true })) continue;
    try {
      const run = await payrollRunService.create(month, SCHEDULER_ACTOR, 'SCHEDULER');
      drafted.push(month);
      await notifyRunDrafted(run);
    } catch (error) {
      // A person may have pressed Create a moment earlier (CONFLICT); anything else is logged and retried next hour.
      logs.server.warn('payroll.scheduler', 'draft', { error, month });
    }
  }
  return drafted;
}

/** Start payouts for released runs whose pay day has come. */
export async function dispatchDueRuns(today = todayKey()): Promise<number> {
  const runs = await HrPayrollRunModel.find({ live: true, status: 'RELEASED', pay_on: { $lte: today } })
    .select('_id')
    .lean<Pick<IPayrollRun, '_id'>[]>();
  if (runs.length === 0 || !(await isPayoutConfigured())) return 0;
  let sent = 0;
  for (const run of runs) sent += await dispatchRun(run._id, SCHEDULER_ACTOR);
  return sent;
}

/** Ask Razorpay about payouts sent a while ago that are still in flight. */
export async function refreshStalePayouts(now = Date.now()): Promise<number> {
  const lines = await HrPayrollLineModel.find({
    'payout.status': 'PROCESSING',
    'payout.razorpay_payout_id': { $ne: '' },
    'payout.initiated_at': { $lt: new Date(now - STALE_PAYOUT_MS) },
  })
    .select('line_ref')
    .limit(REFRESH_BATCH)
    .lean<Pick<IPayrollLine, 'line_ref'>[]>();
  let settled = 0;
  for (const line of lines) {
    try {
      if ((await refreshPayoutStatus('PAYROLL', line.line_ref, SYSTEM_ACTOR)) === 'APPLIED') settled += 1;
    } catch (error) {
      logs.server.warn('payroll.scheduler', 'refresh', { error, lineRef: line.line_ref });
    }
  }
  return settled;
}

export async function runPayrollSweep(): Promise<void> {
  const drafted = await draftDueRuns();
  const sent = await dispatchDueRuns();
  const settled = await refreshStalePayouts();
  if (drafted.length || sent || settled) logs.server.info('payroll.scheduler', 'sweep', { drafted, sent, settled });
}

/** Hourly, on the scheduler leader only (and never under tests). */
export function startPayrollScheduler(): () => void {
  return startClusterJob({
    component: 'payroll.scheduler',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: runPayrollSweep,
  });
}
