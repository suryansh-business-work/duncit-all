/**
 * A working employee's record over time, against a real database: job moves
 * written to the worker history (managers by name), reporting lines that can
 * never loop, exits that serve notice or end at once, the daily sweep that
 * closes notices and takes the Employee console away, and rehire giving it
 * back on the same record.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value])
  );
});

import { HrEmployeeModel } from '../../employee.model';
import { HrEmployeeEventModel } from '../../employeeEvent.model';
import { lifecycleService } from '../../employee.lifecycle';
import { todayKey } from '../../employee.events';
import { hire, JOB, M, person, PERSONAL, Q, rolesOf, type Ctx, stubRoleTransactions } from '../hr.fixtures';

/** `YYYY-MM-DD` `days` from today in the app zone. */
const dayFrom = (days: number) => {
  const d = new Date(`${todayKey()}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function hired(hr: Ctx, first: string, code: string, job: Record<string, unknown> = {}) {
  const account = await person(first, ['USER']);
  const profile = await hire(hr, account, { employee_code: code, personal: { ...PERSONAL, first_name: first }, job: { ...JOB, ...job } });
  return { account, id: profile.employee.id as string, revision: profile.employee.revision as number };
}

const exitInput = (lastDay: string, revision: number, over: Record<string, unknown> = {}) => ({
  exit_type: 'RESIGNATION',
  resignation_date: null,
  last_working_day: lastDay,
  reason: 'Moving cities',
  eligible_for_rehire: true,
  expected_revision: revision,
  ...over,
});

beforeAll(async () => {
  await HrEmployeeModel.syncIndexes();
}, 60_000);

stubRoleTransactions();

describe('job changes', () => {
  it('records a promotion with the reason and the old and new manager by name', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const lead1 = await hired(hr, 'Kiran', 'L-1');
    const lead2 = await hired(hr, 'Devi', 'L-2');
    const meera = await hired(hr, 'Meera', 'M-1', { manager_id: lead1.id });

    const saved = await M.changeHrEmployeeJob(
      {},
      {
        id: meera.id,
        input: {
          job: { ...JOB, job_title: 'Senior Community Manager', manager_id: lead2.id },
          reason: 'PROMOTION',
          effective_date: todayKey(),
          note: 'Strong year',
          expected_revision: meera.revision,
        },
      },
      hr
    );
    expect(saved.job).toMatchObject({ job_title: 'Senior Community Manager', manager: { id: lead2.id, name: 'Devi Nair' } });

    const [event] = await Q.hrEmployeeHistory({}, { id: meera.id }, hr);
    expect(event).toMatchObject({ kind: 'JOB_CHANGED', note: 'Strong year', actor: { name: 'Asha Iyer' } });
    expect(event.changes).toEqual(
      expect.arrayContaining([
        { field: 'reason', from: null, to: 'PROMOTION' },
        { field: 'job.job_title', from: 'Community Manager', to: 'Senior Community Manager' },
        { field: 'job.manager_id', from: 'Kiran Nair (L-1)', to: 'Devi Nair (L-2)' },
      ])
    );
  });

  it('refuses a future-dated change, a change that changes nothing, and a stale revision', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    const move = (over: Record<string, unknown>) =>
      M.changeHrEmployeeJob(
        {},
        { id: meera.id, input: { job: { ...JOB, job_title: 'Lead' }, reason: 'PROMOTION', effective_date: todayKey(), expected_revision: meera.revision, ...over } },
        hr
      );
    await expect(move({ effective_date: dayFrom(3) })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(move({ job: JOB })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await move({});
    await expect(move({ job: { ...JOB, job_title: 'Head' } })).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('never lets a reporting line loop, point at the person, or at someone who left', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const top = await hired(hr, 'Top', 'T-1');
    const mid = await hired(hr, 'Mid', 'T-2', { manager_id: top.id });
    const low = await hired(hr, 'Low', 'T-3', { manager_id: mid.id });
    const reportTo = (id: string, managerId: string, revision: number) =>
      M.changeHrEmployeeJob(
        {},
        { id, input: { job: { ...JOB, manager_id: managerId }, reason: 'MANAGER_CHANGE', effective_date: todayKey(), expected_revision: revision } },
        hr
      );
    await expect(reportTo(top.id, low.id, top.revision)).rejects.toThrow('already reports to this employee');
    await expect(reportTo(top.id, top.id, top.revision)).rejects.toThrow('cannot report to themselves');

    const leaver = await hired(hr, 'Leaver', 'T-9');
    await M.scheduleHrEmployeeExit({}, { id: leaver.id, input: exitInput(dayFrom(-1), leaver.revision) }, hr);
    await expect(reportTo(low.id, leaver.id, low.revision)).rejects.toThrow('has left');
  });
});

describe('exits', () => {
  it('serves notice for a future last day, then the sweep exits and removes the Employee console', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    const lastDay = dayFrom(10);
    const onNotice = await M.scheduleHrEmployeeExit({}, { id: meera.id, input: exitInput(lastDay, meera.revision) }, hr);
    expect(onNotice).toMatchObject({ status: 'ON_NOTICE', exit: { last_working_day: lastDay, exit_type: 'RESIGNATION' } });
    expect(await rolesOf(meera.account.user!.id)).toContain('EMPLOYEE');

    // Not yet: the last day itself is still a working day.
    expect(await lifecycleService.closeEndedNotices(new Date(`${lastDay}T12:00:00.000Z`))).toBe(0);
    const dayAfter = new Date(`${lastDay}T12:00:00.000Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    expect(await lifecycleService.closeEndedNotices(dayAfter)).toBe(1);

    expect((await HrEmployeeModel.findById(meera.id).lean())?.status).toBe('EXITED');
    expect(await rolesOf(meera.account.user!.id)).not.toContain('EMPLOYEE');
    const kinds = (await HrEmployeeEventModel.find({ employee_id: meera.id }).sort({ created_at: 1 }).lean()).map((e) => e.kind);
    expect(kinds).toEqual(['HIRED', 'EXIT_SCHEDULED', 'EXITED']);
    // A second sweep finds nothing left to close.
    expect(await lifecycleService.closeEndedNotices(dayAfter)).toBe(0);
  });

  it('exits at once when the last working day has already passed', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    const exited = await M.scheduleHrEmployeeExit({}, { id: meera.id, input: exitInput(dayFrom(-2), meera.revision) }, hr);
    expect(exited.status).toBe('EXITED');
    expect(await rolesOf(meera.account.user!.id)).not.toContain('EMPLOYEE');
  });

  it('keeps someone on when the exit is cancelled during notice', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    const onNotice = await M.scheduleHrEmployeeExit({}, { id: meera.id, input: exitInput(dayFrom(5), meera.revision) }, hr);
    const kept = await M.cancelHrEmployeeExit({}, { id: meera.id, expected_revision: onNotice.revision }, hr);
    expect(kept).toMatchObject({ status: 'ACTIVE', exit: null });
    expect(await lifecycleService.closeEndedNotices(new Date(`${dayFrom(30)}T12:00:00.000Z`))).toBe(0);
  });

  it('refuses an exit while people still report to the person, or a last day before joining', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const lead = await hired(hr, 'Kiran', 'L-1');
    await hired(hr, 'Meera', 'M-1', { manager_id: lead.id });
    await expect(M.scheduleHrEmployeeExit({}, { id: lead.id, input: exitInput(dayFrom(5), lead.revision) }, hr)).rejects.toThrow('direct reports');

    const fresh = await hired(hr, 'Fresh', 'F-1');
    await expect(M.scheduleHrEmployeeExit({}, { id: fresh.id, input: exitInput('2025-01-01', fresh.revision) }, hr)).rejects.toThrow(
      'before the joining date'
    );
  });

  it('freezes job and pay on a leaver until a rehire', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    const exited = await M.scheduleHrEmployeeExit({}, { id: meera.id, input: exitInput(dayFrom(-1), meera.revision) }, hr);
    await expect(
      M.changeHrEmployeeJob(
        {},
        { id: meera.id, input: { job: { ...JOB, job_title: 'X' }, reason: 'CORRECTION', effective_date: todayKey(), expected_revision: exited.revision } },
        hr
      )
    ).rejects.toThrow('has left');
  });
});

describe('rehire', () => {
  it('reopens the same record with a new joining date and gives the Employee console back', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    const exited = await M.scheduleHrEmployeeExit({}, { id: meera.id, input: exitInput(dayFrom(-20), meera.revision) }, hr);

    await expect(
      M.rehireHrEmployee({}, { id: meera.id, input: { job: { ...JOB, probation_end_date: null, date_of_joining: dayFrom(-25) }, expected_revision: exited.revision } }, hr)
    ).rejects.toThrow('after the last working day');

    const back = await M.rehireHrEmployee(
      {},
      { id: meera.id, input: { job: { ...JOB, probation_end_date: null, date_of_joining: dayFrom(-1), job_title: 'Partnerships Lead' }, expected_revision: exited.revision } },
      hr
    );
    expect(back).toMatchObject({ id: meera.id, status: 'ACTIVE', exit: null, employee_code: 'M-1', job: { job_title: 'Partnerships Lead' } });
    expect(await rolesOf(meera.account.user!.id)).toContain('EMPLOYEE');
    expect(await HrEmployeeModel.countDocuments()).toBe(1);
  });

  it('refuses to rehire someone who never left', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    await expect(M.rehireHrEmployee({}, { id: meera.id, input: { job: JOB, expected_revision: meera.revision } }, hr)).rejects.toThrow(
      'Only someone who has left'
    );
  });
});

describe('personal details', () => {
  it('records which personal fields moved and skips a save that changed nothing', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await hired(hr, 'Meera', 'M-1');
    const same = await M.updateHrEmployeePersonal({}, { id: meera.id, input: { ...PERSONAL, first_name: 'Meera' }, expected_revision: meera.revision }, hr);
    expect(same.revision).toBe(meera.revision);

    const saved = await M.updateHrEmployeePersonal(
      {},
      { id: meera.id, input: { ...PERSONAL, first_name: 'Meera', current_address: 'HSR Layout' }, expected_revision: meera.revision },
      hr
    );
    expect(saved.personal.current_address).toBe('HSR Layout');
    const [event] = await Q.hrEmployeeHistory({}, { id: meera.id }, hr);
    expect(event).toMatchObject({ kind: 'PERSONAL_UPDATED', changes: [{ field: 'personal.current_address', from: 'Indiranagar, Bengaluru', to: 'HSR Layout' }] });
  });
});
