jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn().mockResolvedValue({}) },
}));

import { Types } from 'mongoose';
import { sendEmail } from '@services/email/email.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { UserModel } from '@modules/access/user/user.model';
import { EmailClaimModel } from '@modules/content/emailLog/emailClaim.model';
import { EmployeeTargetModel } from '../../employeeTarget.model';
import { employeeTargetSettingsService } from '../../employeeTarget.settings';
import { runEmployeeTargetReminders } from '../../employeeTarget.reminder';
import { employeeTargetResolvers } from '../../employeeTarget.resolver';
import { makeContext } from '@test/harness';

/**
 * The month-end reminder: once a day per unsubmitted target while the window
 * (Targets > Settings) is open in the app's time zone, in-app and by email,
 * never twice for the same day however many sweeps or workers see it.
 */

const mockEmail = sendEmail as jest.Mock;
const mockInApp = notificationService.create as jest.Mock;

/** 29 Nov 2026, 11:30 in Kolkata — inside the default window (last 3 days). */
const IN_WINDOW = new Date('2026-11-29T06:00:00.000Z');
/** 30 Nov 2026 19:00 UTC is already 1 Dec 00:30 in Kolkata — a grace day for November. */
const KOLKATA_NEXT_DAY = new Date('2026-11-30T19:00:00.000Z');
const BEFORE_WINDOW = new Date('2026-11-20T06:00:00.000Z');

let seq = 0;
async function employee(status = 'ACTIVE') {
  seq += 1;
  return UserModel.create({
    auth: { email: `staff${seq}@x.com` },
    profile: { first_name: 'Priya', last_name: 'Rao' },
    metadata: { role_keys: ['EMPLOYEE'], status },
  });
}

async function target(userId: Types.ObjectId, over: Record<string, unknown> = {}) {
  return EmployeeTargetModel.create({
    employee: { user_id: userId, name: 'Priya Rao', email: null },
    month: '2026-11',
    goals: [{ title: 'Onboard venues' }, { title: 'Run pods' }],
    assigned_by: { user_id: new Types.ObjectId(), name: 'Asha' },
    ...over,
  });
}

beforeEach(() => {
  mockEmail.mockClear();
  mockInApp.mockClear();
});

describe('runEmployeeTargetReminders', () => {
  it('reminds an unsubmitted employee in-app and by email inside the window', async () => {
    const user = await employee();
    const doc = await target(user._id);
    expect(await runEmployeeTargetReminders(IN_WINDOW)).toBe(1);

    expect(mockInApp).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'USER', target_user_ids: [String(user._id)], link_url: expect.stringContaining('/targets') })
    );
    expect(mockEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.auth!.email,
        template: 'employee-target-reminder',
        category: 'internal',
        vars: expect.objectContaining({ name: 'Priya Rao', goal_count: '2', targets_url: expect.stringContaining('/targets') }),
      })
    );
    const stored = await EmployeeTargetModel.findById(doc._id).lean();
    expect(stored!.reminders).toEqual({ last_sent_on: '2026-11-29', count: 1 });
    expect(await EmailClaimModel.countDocuments({ key: `EMPLOYEE_TARGET_REMINDER|${doc._id}|2026-11-29` })).toBe(1);
  });

  it('sends once per day however many sweeps run, and again the next day', async () => {
    const user = await employee();
    await target(user._id);
    await runEmployeeTargetReminders(IN_WINDOW);
    expect(await runEmployeeTargetReminders(IN_WINDOW)).toBe(0);
    expect(mockEmail).toHaveBeenCalledTimes(1);

    // A second worker that skipped the day stamp is still stopped by the claim.
    await EmployeeTargetModel.updateMany({}, { $set: { 'reminders.last_sent_on': null } });
    expect(await runEmployeeTargetReminders(IN_WINDOW)).toBe(0);
    expect(mockEmail).toHaveBeenCalledTimes(1);

    expect(await runEmployeeTargetReminders(new Date('2026-11-30T06:00:00.000Z'))).toBe(1);
    expect(mockEmail).toHaveBeenCalledTimes(2);
  });

  it('reads the day in the app zone, so a UTC evening on the 30th is already a grace day', async () => {
    const user = await employee();
    const doc = await target(user._id);
    expect(await runEmployeeTargetReminders(KOLKATA_NEXT_DAY)).toBe(1);
    expect((await EmployeeTargetModel.findById(doc._id).lean())!.reminders.last_sent_on).toBe('2026-12-01');
  });

  it('skips submitted, reviewed, deleted and other months’ targets, leavers, and days outside the window', async () => {
    const user = await employee();
    const leaver = await employee('INACTIVE');
    await target(user._id, { status: 'SUBMITTED' });
    await target((await employee())._id, { status: 'REVIEWED' });
    await target((await employee())._id, { live: false });
    await target((await employee())._id, { month: '2026-10' });
    await target(leaver._id);
    expect(await runEmployeeTargetReminders(IN_WINDOW)).toBe(0);

    const due = await employee();
    await target(due._id);
    expect(await runEmployeeTargetReminders(BEFORE_WINDOW)).toBe(0);
    expect(mockEmail).not.toHaveBeenCalled();
    expect(mockInApp).not.toHaveBeenCalled();
  });

  it('sends nothing while reminders are switched off', async () => {
    const user = await employee();
    await target(user._id);
    await employeeTargetSettingsService.update({ reminders_enabled: false }, 'admin');
    expect(await runEmployeeTargetReminders(IN_WINDOW)).toBe(0);
    expect(mockEmail).not.toHaveBeenCalled();
  });
});

describe('reminder_active on the employee’s rows', () => {
  afterEach(() => jest.useRealTimers());

  it('flags an unsubmitted target only while its window is open', async () => {
    const user = await employee();
    await target(user._id);
    const ctx = makeContext({ id: String(user._id), roles: ['EMPLOYEE'] });
    const Q = employeeTargetResolvers.Query as Record<string, (...a: any[]) => any>;
    const onlyDate = ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'clearImmediate', 'queueMicrotask', 'hrtime', 'performance'] as const;

    jest.useFakeTimers({ now: IN_WINDOW, doNotFake: [...onlyDate] });
    const due = await Q.myDueEmployeeTargets({}, {}, ctx);
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({ month: '2026-11', reminder_active: true });

    jest.setSystemTime(BEFORE_WINDOW);
    expect(await Q.myDueEmployeeTargets({}, {}, ctx)).toEqual([]);
    const page = await Q.myEmployeeTargetsTable({}, {}, ctx);
    expect(page.rows[0].reminder_active).toBe(false);
  });
});
