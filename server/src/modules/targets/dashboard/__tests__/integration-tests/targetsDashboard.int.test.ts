/**
 * The Targets console's dashboard against a real database: this month's live
 * targets by status (other months and deleted rows left out), the mean
 * completion of the reports, the review queue oldest first, the month-end
 * reminders still running, the newest saved growth plan, and only the
 * console's own seats get in.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { EmployeeTargetModel } from '../../../employeeTarget/employeeTarget.model';
import { employeeTargetSettingsService } from '../../../employeeTarget/employeeTarget.settings';
import { growthCalculationResolvers } from '../../../growthCalculation/growthCalculation.resolver';
import { targetsDashboardResolvers } from '../../targetsDashboard.resolver';
import { targetsDashboardService } from '../../targetsDashboard.service';

const GROWTH = growthCalculationResolvers.Mutation as Record<string, (...a: any[]) => any>;
const Q = targetsDashboardResolvers.Query as Record<string, (...a: any[]) => any>;

/** 29 Nov 2026, 11:30 in Kolkata: inside the default reminder window (the month's last 3 days). */
const IN_WINDOW = new Date('2026-11-29T06:00:00.000Z');
/** 10 Nov 2026: no reminder window is open. */
const MID_MONTH = new Date('2026-11-10T06:00:00.000Z');

const INPUTS = {
  pax_per_pod: 10,
  price_per_pax: 400,
  profit_margin_pct: 20,
  hosts_per_venue: 2,
  pods_per_host_per_month: 2,
  venues_per_city: 100,
  target_cities: 10,
  host_conversion_pct: 10,
  venue_conversion_pct: 5,
};

let seq = 0;
async function user(roles: string[], status = 'ACTIVE') {
  seq += 1;
  const email = `dash${seq}@x.com`;
  const doc = await UserModel.create({
    auth: { email },
    profile: { first_name: 'Asha', last_name: 'Rao' },
    metadata: { role_keys: roles, status },
  });
  return makeContext({ id: String(doc._id), email, roles });
}

type TargetOver = { month?: string; status?: string; percent?: number; submittedAt?: string; live?: boolean };

/** A target stored as the console would have left it — submitted ones carry a report. */
function target({ month = '2026-11', status = 'ASSIGNED', percent = 50, submittedAt, live = true }: TargetOver = {}) {
  const reported = status !== 'ASSIGNED';
  return EmployeeTargetModel.create({
    employee: { user_id: new Types.ObjectId(), name: `Employee ${++seq}`, email: null },
    month,
    goals: [{ title: 'Onboard venues' }],
    status,
    submission: reported
      ? {
          completion_percent: percent,
          achievements: [{ title: 'Signed venues' }],
          submitted_at: new Date(submittedAt ?? '2026-11-20T06:00:00.000Z'),
          submitted_by: new Types.ObjectId(),
        }
      : null,
    assigned_by: { user_id: new Types.ObjectId(), name: 'Asha Rao' },
    live,
  });
}

describe('targetsDashboard', () => {
  it('answers zeros, no average and no plan while nothing exists', async () => {
    const admin = await user(['TARGETS_MANAGER']);
    const board = await targetsDashboardService.overview(admin.user!, MID_MONTH);
    expect(board).toEqual({
      month: '2026-11',
      current_month: { total: 0, assigned: 0, submitted: 0, reviewed: 0, average_completion: null },
      active_employees: 0,
      awaiting_review: 0,
      review_queue: [],
      reminders_due: 0,
      saved_calculations: 0,
      latest_calculation: null,
    });
  });

  it("counts only this month's live targets, and averages the reported ones", async () => {
    const admin = await user(['TARGETS_MANAGER']);
    await target();
    await target();
    await target({ status: 'SUBMITTED', percent: 80 });
    await target({ status: 'REVIEWED', percent: 45 });
    await target({ status: 'REVIEWED', percent: 100 });
    await target({ month: '2026-10', status: 'REVIEWED', percent: 0 });
    await target({ status: 'SUBMITTED', percent: 0, live: false });

    const board = await targetsDashboardService.overview(admin.user!, MID_MONTH);
    expect(board.current_month).toEqual({ total: 5, assigned: 2, submitted: 1, reviewed: 2, average_completion: 75 });
  });

  it('rounds the average to one decimal', async () => {
    const admin = await user(['TARGETS_MANAGER']);
    await target({ status: 'SUBMITTED', percent: 33 });
    await target({ status: 'SUBMITTED', percent: 33 });
    await target({ status: 'REVIEWED', percent: 34 });
    const board = await targetsDashboardService.overview(admin.user!, MID_MONTH);
    expect(board.current_month.average_completion).toBe(33.3);
  });

  it('counts active employees only', async () => {
    const admin = await user(['TARGETS_MANAGER']);
    await user(['EMPLOYEE']);
    await user(['EMPLOYEE', 'HR_MANAGER']);
    await user(['EMPLOYEE'], 'INACTIVE');
    await user(['MEMBER']);
    const board = await targetsDashboardService.overview(admin.user!, MID_MONTH);
    expect(board.active_employees).toBe(2);
  });

  it('queues every month’s unreviewed reports, longest-waiting first, five at most', async () => {
    const admin = await user(['TARGETS_MANAGER']);
    const days = ['07', '03', '05', '01', '06', '02'];
    for (const day of days) {
      await target({ month: day === '01' ? '2026-10' : '2026-11', status: 'SUBMITTED', submittedAt: `2026-11-${day}T06:00:00.000Z` });
    }
    await target({ status: 'REVIEWED', submittedAt: '2026-10-01T06:00:00.000Z' });
    await target({ status: 'SUBMITTED', submittedAt: '2026-09-01T06:00:00.000Z', live: false });

    const board = await targetsDashboardService.overview(admin.user!, MID_MONTH);
    expect(board.awaiting_review).toBe(6);
    expect(board.review_queue.map((row) => row.submission?.submitted_at.slice(8, 10))).toEqual(['01', '02', '03', '05', '06']);
    expect(board.review_queue[0]).toMatchObject({ month: '2026-10', status: 'SUBMITTED', submission: { completion_percent: 50 } });
  });

  it('counts unreported targets while their reminder window is open, and none outside it or when reminders are off', async () => {
    const admin = await user(['TARGETS_MANAGER']);
    await target();
    await target();
    await target({ status: 'SUBMITTED' });
    await target({ month: '2026-12' });
    await target({ live: false });

    expect((await targetsDashboardService.overview(admin.user!, IN_WINDOW)).reminders_due).toBe(2);
    expect((await targetsDashboardService.overview(admin.user!, MID_MONTH)).reminders_due).toBe(0);

    await employeeTargetSettingsService.update({ reminders_enabled: false }, admin.user!.id);
    expect((await targetsDashboardService.overview(admin.user!, IN_WINDOW)).reminders_due).toBe(0);
  });

  it('shows the newest saved plan, skips deleted ones, and says whether the viewer may edit it', async () => {
    const asha = await user(['TARGETS_MANAGER']);
    const ravi = await user(['TARGETS_MANAGER']);
    await GROWTH.saveGrowthCalculation({}, { input: { title: 'First plan', inputs: INPUTS } }, asha);
    const newest = await GROWTH.saveGrowthCalculation(
      {},
      { input: { title: 'Twelve cities', inputs: { ...INPUTS, target_cities: 12 } } },
      asha
    );
    const dropped = await GROWTH.saveGrowthCalculation({}, { input: { title: 'Dropped', inputs: INPUTS } }, ravi);
    await GROWTH.deleteGrowthCalculation({}, { id: dropped.id }, ravi);

    const mine = await targetsDashboardService.overview(asha.user!, MID_MONTH);
    expect(mine.saved_calculations).toBe(2);
    expect(mine.latest_calculation).toMatchObject({
      id: newest.id,
      title: 'Twelve cities',
      totals: { cities: 12, monthly_gmv: '19200000.00' },
      calculated_by: { user_id: asha.user!.id },
      can_edit: true,
    });
    const theirs = await targetsDashboardService.overview(ravi.user!, MID_MONTH);
    expect(theirs.latest_calculation).toMatchObject({ id: newest.id, can_edit: false });
  });

  it('opens to the Targets console and super admins, and refuses everyone else', async () => {
    await expect(Q.targetsDashboard({}, {}, await user(['TARGETS_MANAGER']))).resolves.toMatchObject({
      month: expect.stringMatching(/^\d{4}-\d{2}$/),
    });
    await expect(Q.targetsDashboard({}, {}, await user(['SUPER_ADMIN']))).resolves.toBeDefined();
    await expect(Q.targetsDashboard({}, {}, await user(['FINANCE_MANAGER']))).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(Q.targetsDashboard({}, {}, await user(['EMPLOYEE']))).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(Q.targetsDashboard({}, {}, makeContext())).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });
});
