/**
 * Hiring against a real database: the record, its first pay revision and its
 * HIRED row land together, the account gains exactly the Employee console,
 * codes are unique, a double-pressed Hire writes once, and nobody outside HR
 * can hire at all.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value])
  );
});

import { UserModel } from '@modules/access/user/user.model';
import { HrEmployeeModel } from '../../employee.model';
import { HrCompensationModel } from '../../compensation.model';
import { HrEmployeeEventModel } from '../../employeeEvent.model';
import { hrSettingsService } from '@modules/hr/settings/hrSettings.service';
import { hire, JOB, M, PAY, person, PERSONAL, Q, rolesOf, stubRoleTransactions } from '../hr.fixtures';

beforeAll(async () => {
  await HrEmployeeModel.syncIndexes();
  await HrCompensationModel.syncIndexes();
}, 60_000);

stubRoleTransactions();

describe('hiring an existing account', () => {
  it('writes the record, the hire pay revision and the HIRED row, and grants EMPLOYEE', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await person('Meera', ['USER']);
    const profile = await hire(hr, meera, { employee_code: 'dun-7' });

    expect(profile.employee).toMatchObject({
      user_id: meera.user!.id,
      employee_code: 'DUN-7',
      status: 'ACTIVE',
      full_name: 'Meera Nair',
      account_email: meera.user!.email,
      job: { job_title: 'Community Manager', department: 'Growth', employment_type: 'FULL_TIME', date_of_joining: '2026-01-05' },
      created_by: { user_id: hr.user!.id, name: 'Asha Iyer' },
    });
    expect(profile.has_employee_access).toBe(true);
    expect(await rolesOf(meera.user!.id)).toEqual(expect.arrayContaining(['USER', 'EMPLOYEE']));

    // Totals come from the lines: 66,000 gross (incl. the target line), 1,800 deducted, 1,800 employer.
    expect(profile.current_compensation).toMatchObject({
      reason: 'HIRE',
      is_current: true,
      totals: { gross_monthly: 66000, fixed_gross_monthly: 56000, variable_monthly: 10000, net_monthly: 64200, annual_ctc: 813600 },
    });
    const events = await HrEmployeeEventModel.find({ employee_id: profile.employee.id }).lean();
    expect(events.map((e) => e.kind)).toEqual(['HIRED']);
  });

  it('hands out the next automatic code from the settings prefix', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    await hrSettingsService.update({ employee_code_prefix: 'dn', employee_code_digits: 3 }, hr.user!.id);
    const first = await hire(hr, await person('One', ['USER']));
    const second = await hire(hr, await person('Two', ['USER']));
    expect([first.employee.employee_code, second.employee.employee_code]).toEqual(['DN-001', 'DN-002']);
  });

  it('skips an automatic code HR already typed by hand', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    await hrSettingsService.update({ employee_code_prefix: 'E', employee_code_digits: 2 }, hr.user!.id);
    await hire(hr, await person('Typed', ['USER']), { employee_code: 'E-01' });
    const auto = await hire(hr, await person('Auto', ['USER']));
    expect(auto.employee.employee_code).toBe('E-02');
  });

  it('refuses a code already in use', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    await hire(hr, await person('One', ['USER']), { employee_code: 'X-1' });
    await expect(hire(hr, await person('Two', ['USER']), { employee_code: 'X-1' })).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
  });

  it('refuses a second record for the same account and points at Rehire for a leaver', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await person('Meera', ['USER']);
    await hire(hr, meera);
    await expect(hire(hr, meera)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    expect(await HrEmployeeModel.countDocuments()).toBe(1);
  });

  it('returns the first record when the same Hire press arrives twice', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await person('Meera', ['USER']);
    const first = await hire(hr, meera, { client_request_id: 'press-1' });
    const again = await hire(hr, meera, { client_request_id: 'press-1' });
    expect(again.employee.id).toBe(first.employee.id);
    expect(await HrEmployeeModel.countDocuments()).toBe(1);
    expect(await HrCompensationModel.countDocuments()).toBe(1);
  });

  it('refuses a suspended account', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const gone = await person('Gone', ['USER'], 'SUSPENDED');
    await expect(hire(hr, gone)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('hiring someone new to Duncit', () => {
  it('opens a password-less account and grants it USER and EMPLOYEE', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const profile = await hire(hr, null, { new_account: { email: 'New.Joiner@X.com', phone_number: '9000000001', phone_extension: '+91' } });
    const account = await UserModel.findById(profile.employee.user_id).lean<any>();
    expect(account.auth.email).toBe('new.joiner@x.com');
    expect(account.auth.password ?? null).toBeNull();
    expect(account.profile).toMatchObject({ first_name: PERSONAL.first_name, last_name: PERSONAL.last_name });
    expect(await rolesOf(profile.employee.user_id)).toEqual(expect.arrayContaining(['USER', 'EMPLOYEE']));
  });

  it('refuses an email another account already uses', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const taken = await person('Taken', ['USER']);
    await expect(hire(hr, null, { new_account: { email: taken.user!.email } })).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    expect(await HrEmployeeModel.countDocuments()).toBe(0);
  });

  it('refuses both an existing account and a new one at once', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await person('Meera', ['USER']);
    await expect(hire(hr, meera, { new_account: { email: 'other@x.com' } })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', fields: ['account_user_id'] },
    });
  });

  it('opens no account when the hire itself is invalid', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const before = await UserModel.countDocuments();
    await expect(
      hire(hr, null, { new_account: { email: 'early@x.com' }, compensation: { ...PAY, effective_from: '2025-12-01' } })
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(await UserModel.countDocuments()).toBe(before);
  });
});

describe('validation and access', () => {
  it('refuses a probation that ends before the joining date, naming the field', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const job = { ...JOB, probation_end_date: '2025-12-31' };
    await expect(hire(hr, await person('Meera', ['USER']), { job })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', fields: ['job.probation_end_date'] },
    });
  });

  it('refuses someone younger than the minimum age', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const personal = { ...PERSONAL, date_of_birth: '2020-01-01' };
    await expect(hire(hr, await person('Kid', ['USER']), { personal })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('lets no one outside HR hire, read the directory or reveal bank details', async () => {
    const employee = await person('Ravi', ['EMPLOYEE']);
    const targets = await person('Tara', ['TARGETS_MANAGER']);
    for (const ctx of [employee, targets]) {
      await expect(hire(ctx, await person('X', ['USER']))).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
      await expect(Q.hrEmployeesTable({}, {}, ctx)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
      await expect(Q.hrEmployeeBankDetails({}, { id: '000000000000000000000000' }, ctx)).rejects.toMatchObject({
        extensions: { code: 'FORBIDDEN' },
      });
    }
  });

  it('lets SUPER_ADMIN hire too', async () => {
    const admin = await person('Root', ['SUPER_ADMIN']);
    const profile = await hire(admin, await person('Meera', ['USER']));
    expect(profile.employee.status).toBe('ACTIVE');
  });
});

describe('the directory', () => {
  it('lists, searches and filters records, with the manager resolved and no bank data', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const lead = await hire(hr, await person('Lead', ['USER']), {
      employee_code: 'L-1',
      personal: { ...PERSONAL, first_name: 'Kiran', last_name: 'Rao' },
      job: { ...JOB, job_title: 'Head of Growth' },
    });
    await hire(hr, await person('Report', ['USER']), {
      employee_code: 'R-1',
      job: { ...JOB, manager_id: lead.employee.id, department: 'Ops' },
    });

    const all = await Q.hrEmployeesTable({}, { query: {} }, hr);
    expect(all.total).toBe(2);
    const report = all.rows.find((row: any) => row.employee_code === 'R-1');
    expect(report.job.manager).toEqual({ id: lead.employee.id, employee_code: 'L-1', name: 'Kiran Rao', job_title: 'Head of Growth' });
    expect(report.bank).toEqual({
      account_holder_name: null,
      account_number_masked: null,
      ifsc: null,
      bank_name: null,
      pan_masked: null,
      uan: null,
    });

    const ops = await Q.hrEmployeesTable({}, { query: { filters: [{ field: 'department', op: 'eq', value: 'Ops' }] } }, hr);
    expect(ops.rows.map((row: any) => row.employee_code)).toEqual(['R-1']);
    const found = await Q.hrEmployeesTable({}, { query: { search: 'kiran' } }, hr);
    expect(found.rows.map((row: any) => row.employee_code)).toEqual(['L-1']);
  });

  it('lists Employee-role accounts that HR has no record for', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const legacy = await person('Legacy', ['EMPLOYEE']);
    await hire(hr, await person('Recorded', ['USER']));
    const gaps = await Q.hrUnrecordedEmployees({}, {}, hr);
    expect(gaps.map((g: any) => g.id)).toEqual([legacy.user!.id]);
  });

  it('offers accounts to hire into, flagging those already on record', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await person('Meera', ['USER']);
    const other = await person('Meenal', ['USER']);
    await hire(hr, meera);
    const options = await Q.hrAccountOptions({}, { search: 'mee' }, hr);
    const byId = new Map(options.map((o: any) => [o.id, o.has_hr_record]));
    expect(byId.get(meera.user!.id)).toBe(true);
    expect(byId.get(other.user!.id)).toBe(false);
    expect(await Q.hrAccountOptions({}, { search: 'm' }, hr)).toEqual([]);
  });

  it('counts heads for the dashboard', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    await hire(hr, await person('One', ['USER']));
    await hire(hr, await person('Two', ['USER']), { job: { ...JOB, department: 'Ops' } });
    const stats = await Q.hrEmployeeStats({}, {}, hr);
    expect(stats).toMatchObject({ active: 2, on_notice: 0, exited: 0 });
    expect(stats.by_department).toEqual(
      expect.arrayContaining([
        { department: 'Growth', count: 1 },
        { department: 'Ops', count: 1 },
      ])
    );
  });
});

describe('restoring access', () => {
  it('gives a current employee back the EMPLOYEE role removed elsewhere', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const meera = await person('Meera', ['USER']);
    const profile = await hire(hr, meera);
    await UserModel.updateOne({ _id: meera.user!.id }, { $set: { 'metadata.role_keys': ['USER'] } });
    expect((await Q.hrEmployee({}, { id: profile.employee.id }, hr)).has_employee_access).toBe(false);
    await M.restoreHrEmployeeAccess({}, { id: profile.employee.id }, hr);
    expect(await rolesOf(meera.user!.id)).toContain('EMPLOYEE');
  });
});
