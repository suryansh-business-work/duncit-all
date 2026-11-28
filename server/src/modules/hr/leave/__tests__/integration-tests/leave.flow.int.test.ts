/**
 * Leave against a real database: what a request costs, the balance it draws
 * on, the overlap guard, who may decide (the reporting manager, HR when there
 * is none, never the requester), cancelling, the payroll lock on unpaid leave,
 * and the calendar the Employee console reads.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value])
  );
});
jest.mock('@modules/hr/hr.notify', () => ({
  ...jest.requireActual('@modules/hr/hr.notify'),
  notifyHr: jest.fn().mockResolvedValue(undefined),
}));

import { notifyHr } from '@modules/hr/hr.notify';
import { HrPayrollRunModel } from '@modules/hr/payroll/payroll.model';
import { person, stubRoleTransactions, JOB } from '@modules/hr/employee/__tests__/hr.fixtures';
import { myHrCalendarResolvers } from '@modules/hr/calendar/calendar.resolver';
import { HrLeaveDayClaimModel, HrLeaveRequestModel } from '../../leave.model';
import { HrHolidayModel } from '../../leave.settings';
import { todayKey } from '@modules/hr/employee/employee.events';
import { addDays, leaveYearOf } from '../../leave.rules';
import { CASUAL, LEAVE_SETTINGS, LM, LQ, UNPAID, asRoles, earlyMonday, employee, leaveType } from '../../../__tests__/hr-ops.fixtures';

beforeAll(async () => {
  await Promise.all([HrLeaveRequestModel.syncIndexes(), HrLeaveDayClaimModel.syncIndexes(), HrHolidayModel.syncIndexes(), HrPayrollRunModel.syncIndexes()]);
}, 60_000);

stubRoleTransactions();
beforeEach(() => jest.mocked(notifyHr).mockClear());

async function team() {
  const hr = await person('Asha', ['HR_MANAGER']);
  await LM.updateHrLeaveSettings({}, { input: LEAVE_SETTINGS }, hr);
  const manager = await employee(hr, 'Kabir');
  const report = await employee(hr, 'Meera', { job: { ...JOB, manager_id: manager.id } });
  const casual = await leaveType(hr);
  return { hr, manager, report, casual };
}

const apply = (ctx: unknown, input: Record<string, unknown>) => LM.applyLeave({}, { input }, ctx);

describe('asking for leave', () => {
  it('costs working days only, draws on the balance and tells the reporting manager', async () => {
    const { hr, manager, report, casual } = await team();
    const monday = earlyMonday();
    await LM.saveHrHoliday({}, { input: { date: addDays(monday, 1), name: 'Founders Day' } }, hr);

    const request = await apply(report.ctx, { leave_type_id: casual.id, start_date: monday, end_date: addDays(monday, 2), reason: 'Family visit' });
    expect(request).toMatchObject({ status: 'PENDING', days: 2, routed_to_hr: false, can_cancel: true });

    const overview = await LQ.myLeaveOverview({}, {}, report.ctx);
    expect(overview.balances.find((b: any) => b.leave_type.id === casual.id)).toMatchObject({ granted: 12, pending: 2, taken: 0, available: 10 });

    const [notice] = jest.mocked(notifyHr).mock.calls[0] ?? [];
    expect(notice?.userIds).toEqual([manager.userId]);
    expect(notice?.email?.template).toBe('hr-leave-requested');
  });

  it('refuses a second request on a date already taken, but returns the first one for a repeated press', async () => {
    const { report, casual } = await team();
    const monday = earlyMonday();
    const input = { leave_type_id: casual.id, start_date: monday, end_date: addDays(monday, 2), client_request_id: 'press-0001' };
    const first = await apply(report.ctx, input);
    expect((await apply(report.ctx, input)).id).toBe(first.id);
    await expect(apply(report.ctx, { leave_type_id: casual.id, start_date: addDays(monday, 2), end_date: addDays(monday, 2) })).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
      message: `You already have leave on ${addDays(monday, 2)}`,
    });
    expect(await HrLeaveRequestModel.countDocuments({})).toBe(1);
  });

  it('refuses more days than the balance holds, and dates that are all weekly offs', async () => {
    const { hr, report, casual } = await team();
    const scarce = await leaveType(hr, { ...CASUAL, name: 'Scarce leave', code: 'SL', annual_quota: 0.5 });
    const monday = earlyMonday();
    await expect(apply(report.ctx, { leave_type_id: scarce.id, start_date: monday, end_date: monday })).rejects.toThrow(
      'Not enough Scarce leave left: 0.5 day(s) available, this needs 1'
    );
    await expect(apply(report.ctx, { leave_type_id: casual.id, start_date: addDays(monday, 5), end_date: addDays(monday, 6) })).rejects.toThrow(
      'Every date you picked is a weekly off or a holiday'
    );
  });

  it('refuses unpaid leave in a month whose payroll is already approved', async () => {
    const { hr, report } = await team();
    const unpaid = await leaveType(hr, UNPAID);
    const monday = earlyMonday();
    await HrPayrollRunModel.create({
      month: monday.slice(0, 7),
      status: 'APPROVED',
      scheduled_pay_date: monday,
      source: 'MANUAL',
      computed_at: new Date(),
      computed_by: { user_id: null, name: 'test' },
      created_by: { user_id: null, name: 'test' },
    });
    await expect(apply(report.ctx, { leave_type_id: unpaid.id, start_date: monday, end_date: monday })).rejects.toThrow('is already approved');
  });
});

describe('deciding', () => {
  it('lets the reporting manager approve, and never the requester or a colleague', async () => {
    const { hr, manager, report, casual } = await team();
    const colleague = await employee(hr, 'Ravi');
    const monday = earlyMonday();
    const request = await apply(report.ctx, { leave_type_id: casual.id, start_date: monday, end_date: monday });
    const decide = (ctx: unknown, approve: boolean, note?: string) => LM.decideLeaveRequest({}, { id: request.id, approve, note }, ctx);

    await expect(decide(report.ctx, true)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(decide(colleague.ctx, true)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(decide(manager.ctx, false)).rejects.toThrow('Say why the request is declined');

    const approved = await decide(manager.ctx, true);
    expect(approved).toMatchObject({ status: 'APPROVED', decided_as_hr: false, decided_by: expect.stringContaining('Kabir') });
    const balance = (await LQ.myLeaveOverview({}, {}, report.ctx)).balances.find((b: any) => b.leave_type.id === casual.id);
    expect(balance).toMatchObject({ taken: 1, pending: 0, available: 11 });
    await expect(decide(manager.ctx, true)).rejects.toThrow('already been decided');
    expect(jest.mocked(notifyHr).mock.calls.at(-1)?.[0]).toMatchObject({ userIds: [report.userId], email: { template: 'hr-leave-decided' } });
  });

  it('sends a request with no reporting manager to HR, who decide it as HR', async () => {
    const { hr, casual } = await team();
    const solo = await employee(hr, 'Ira');
    const request = await apply(solo.ctx, { leave_type_id: casual.id, start_date: earlyMonday(), end_date: earlyMonday() });
    expect(request.routed_to_hr).toBe(true);
    const declined = await LM.decideLeaveRequest({}, { id: request.id, approve: false, note: 'Quarter close that week' }, hr);
    expect(declined).toMatchObject({ status: 'REJECTED', decided_as_hr: true, decision_note: 'Quarter close that week' });
    expect(await HrLeaveDayClaimModel.countDocuments({ request_id: request.id })).toBe(0);
  });

  it('frees the dates when the employee cancels, so they can ask again', async () => {
    const { report, casual } = await team();
    const monday = earlyMonday();
    const input = { leave_type_id: casual.id, start_date: monday, end_date: monday };
    const first = await apply(report.ctx, input);
    const cancelled = await LM.cancelMyLeave({}, { id: first.id, note: 'Plans changed' }, report.ctx);
    expect(cancelled).toMatchObject({ status: 'CANCELLED', can_cancel: false, cancellation_note: 'Plans changed' });
    await expect(apply(report.ctx, input)).resolves.toMatchObject({ status: 'PENDING' });
  });

  it('lets HR adjust a balance with a reason but never their own', async () => {
    const { hr, report, casual } = await team();
    const year = leaveYearOf(todayKey(), LEAVE_SETTINGS.leave_year_start_month);
    await LM.adjustHrLeaveBalance({}, { input: { employee_id: report.id, leave_type_id: casual.id, leave_year: year, days: 2.5, note: 'Opening balance' } }, hr);
    const sheet = await LQ.hrLeaveBalances({}, { employee_id: report.id }, hr);
    expect(sheet.adjustments).toEqual([expect.objectContaining({ days: 2.5, note: 'Opening balance' })]);
    const hrAsEmployee = await employee(hr, 'Self');
    const selfHr = asRoles(hrAsEmployee.ctx, ['HR_MANAGER']);
    await expect(
      LM.adjustHrLeaveBalance({}, { input: { employee_id: hrAsEmployee.id, leave_type_id: casual.id, leave_year: year, days: 5, note: 'For me' } }, selfHr)
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

describe('the calendar', () => {
  it('shows the holiday, the employee\'s own leave and, for the manager, the team\'s leave', async () => {
    const { hr, manager, report, casual } = await team();
    const monday = earlyMonday();
    await LM.saveHrHoliday({}, { input: { date: addDays(monday, 3), name: 'Harvest festival' } }, hr);
    await apply(report.ctx, { leave_type_id: casual.id, start_date: monday, end_date: monday });
    const month = monday.slice(0, 7);
    const calendar = (ctx: unknown) => myHrCalendarResolvers.Query.myHrCalendar({}, { month }, ctx as any);

    const mine = await calendar(report.ctx);
    expect(mine.weekly_off_days).toEqual([0, 6]);
    expect(mine.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'HOLIDAY', start_date: addDays(monday, 3), name: 'Harvest festival' }),
        expect.objectContaining({ kind: 'LEAVE', start_date: monday, name: CASUAL.name, status: 'PENDING' }),
      ])
    );
    const managerView = await calendar(manager.ctx);
    expect(managerView.is_manager).toBe(true);
    expect(managerView.events).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'TEAM_LEAVE', name: expect.stringContaining('Meera'), detail: CASUAL.name })]));
  });
});
