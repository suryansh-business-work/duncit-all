/**
 * The Employee console's view of its own record, the link to Targets, and HR
 * settings — against a real database. An employee only ever reaches their own
 * record and may change only their contact details; HR sees the person's
 * monthly targets; Targets labels its picker from the HR directory.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value])
  );
});

import { makeContext } from '@test/harness';
import { HrEmployeeModel } from '../../employee.model';
import { hrSettingsResolvers } from '@modules/hr/settings/hrSettings.resolver';
import { employeeTargetResolvers } from '@modules/targets/employeeTarget/employeeTarget.resolver';
import { hire, JOB, M, person, PERSONAL, Q, stubRoleTransactions } from '../hr.fixtures';

const TQ = employeeTargetResolvers.Query as Record<string, (...a: any[]) => any>;
const TM = employeeTargetResolvers.Mutation as Record<string, (...a: any[]) => any>;
const SQ = hrSettingsResolvers.Query as Record<string, (...a: any[]) => any>;
const SM = hrSettingsResolvers.Mutation as Record<string, (...a: any[]) => any>;

/** The employee's own session once the hire granted EMPLOYEE. */
const asEmployee = (account: ReturnType<typeof makeContext>) =>
  makeContext({ id: account.user!.id, email: account.user!.email, roles: ['USER', 'EMPLOYEE'] });

beforeAll(async () => {
  await HrEmployeeModel.syncIndexes();
}, 60_000);

stubRoleTransactions();

describe('my HR profile', () => {
  it('is null until HR adds the record, then shows the record and the pay in force', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const account = await person('Meera', ['USER']);
    const me = asEmployee(account);
    expect(await Q.myHrProfile({}, {}, me)).toBeNull();
    await hire(hr, account);
    const mine = await Q.myHrProfile({}, {}, me);
    expect(mine.employee).toMatchObject({ user_id: account.user!.id, full_name: 'Meera Nair' });
    expect(mine.current_compensation.totals.gross_monthly).toBe(66000);
  });

  it('changes contact details only — a name in the input is ignored — and logs the change', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const account = await person('Meera', ['USER']);
    const { employee } = await hire(hr, account);
    const me = asEmployee(account);
    const saved = await M.updateMyHrContact(
      {},
      { input: { first_name: 'Hacked', current_address: 'Koramangala', emergency_contact: null, phone_extension: '+91' }, expected_revision: employee.revision },
      me
    );
    expect(saved.employee.personal).toMatchObject({ first_name: 'Meera', current_address: 'Koramangala', emergency_contact: null });
    const [event] = await Q.hrEmployeeHistory({}, { id: employee.id }, hr);
    expect(event).toMatchObject({ kind: 'CONTACT_UPDATED', actor: { user_id: account.user!.id } });
  });

  it('refuses a stale revision and someone without a record', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const account = await person('Meera', ['USER']);
    const { employee } = await hire(hr, account);
    const me = asEmployee(account);
    await M.updateMyHrContact({}, { input: { current_address: 'A' }, expected_revision: employee.revision }, me);
    await expect(M.updateMyHrContact({}, { input: { current_address: 'B' }, expected_revision: employee.revision }, me)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
    const stranger = asEmployee(await person('Nobody', ['USER']));
    await expect(M.updateMyHrContact({}, { input: { current_address: 'C' }, expected_revision: 0 }, stranger)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('is closed to accounts without the Employee console', async () => {
    const plain = await person('Plain', ['USER']);
    await expect(Q.myHrProfile({}, {}, plain)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

describe('the Targets link', () => {
  it('shows HR the person’s monthly targets, newest month first', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const targetsAdmin = await person('Tara', ['TARGETS_MANAGER']);
    const account = await person('Meera', ['USER']);
    const { employee, targets_console_url } = await hire(hr, account);
    const goals = [{ title: 'Onboard venues', target_value: 40, unit: 'venues' }];
    await TM.assignEmployeeTarget({}, { input: { employee_id: account.user!.id, month: '2026-10', goals } }, targetsAdmin);
    await TM.assignEmployeeTarget({}, { input: { employee_id: account.user!.id, month: '2026-11', goals } }, targetsAdmin);

    const targets = await Q.hrEmployeeTargets({}, { id: employee.id }, hr);
    expect(targets.map((t: any) => t.month)).toEqual(['2026-11', '2026-10']);
    expect(targets_console_url).toMatch(/\/employee-targets$/);
  });

  it('labels the Targets picker with code, title and department, and finds people by code', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const targetsAdmin = await person('Tara', ['TARGETS_MANAGER']);
    const account = await person('Meera', ['USER']);
    await hire(hr, account, { employee_code: 'GRW-42', job: { ...JOB, job_title: 'Growth Lead', department: 'Growth' } });

    const byCode = await TQ.targetAssignableEmployees({}, { search: 'grw-42' }, targetsAdmin);
    expect(byCode).toEqual([
      expect.objectContaining({ id: account.user!.id, employee_code: 'GRW-42', job_title: 'Growth Lead', department: 'Growth' }),
    ]);
    // Accounts with Employee access but no HR record still show, just unlabelled.
    const legacy = await person('Legacy', ['EMPLOYEE']);
    const all = await TQ.targetAssignableEmployees({}, { search: null }, targetsAdmin);
    expect(all.find((a: any) => a.id === legacy.user!.id)).toMatchObject({ employee_code: null, job_title: null, department: null });
  });
});

describe('HR settings', () => {
  it('saves only the fields given, cleans the lists and previews the next code', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const saved = await SM.updateHrSettings(
      {},
      { input: { employee_code_prefix: 'dun', employee_code_digits: 5, departments: [' Growth ', 'growth', 'Ops', ''] } },
      hr
    );
    expect(saved).toMatchObject({ employee_code_prefix: 'DUN', next_employee_code: 'DUN-00001', departments: ['Growth', 'Ops'], default_currency: 'INR' });
    const again = await SM.updateHrSettings({}, { input: { work_locations: ['Bengaluru'] } }, hr);
    expect(again).toMatchObject({ departments: ['Growth', 'Ops'], work_locations: ['Bengaluru'] });
    expect(await SQ.hrSettings({}, {}, hr)).toMatchObject({ employee_code_digits: 5 });
  });

  it('refuses a template whose first line is not a basic, or with two balance lines', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const line = (calc: string, value = 10) => ({ label: calc, type: 'EARNING', calc, value });
    await expect(SM.updateHrSettings({}, { input: { salary_template: [line('PERCENT_OF_BASIC')] } }, hr)).rejects.toThrow('first line is the basic');
    await expect(
      SM.updateHrSettings({}, { input: { salary_template: [line('PERCENT_OF_CTC', 40), line('BALANCE', 0), line('BALANCE', 0)] } }, hr)
    ).rejects.toThrow('Only one line can take the balance');
    const ok = await SM.updateHrSettings({}, { input: { salary_template: [line('PERCENT_OF_CTC', 40), line('PERCENT_OF_BASIC', 50), line('BALANCE', 0)] } }, hr);
    expect(ok.salary_template).toHaveLength(3);
  });

  it('is HR-only', async () => {
    const employee = await person('Ravi', ['EMPLOYEE']);
    await expect(SQ.hrSettings({}, {}, employee)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(SM.updateHrSettings({}, { input: {} }, employee)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

describe('manager options', () => {
  it('offers current employees by name or code and leaves out the person being edited', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const a = await hire(hr, await person('A', ['USER']), { employee_code: 'A-1', personal: { ...PERSONAL, first_name: 'Anil' } });
    await hire(hr, await person('B', ['USER']), { employee_code: 'B-1', personal: { ...PERSONAL, first_name: 'Bina' } });
    const options = await Q.hrManagerOptions({}, { search: null, exclude_id: a.employee.id }, hr);
    expect(options.map((o: any) => o.employee_code)).toEqual(['B-1']);
    const byCode = await Q.hrManagerOptions({}, { search: 'a-1', exclude_id: null }, hr);
    expect(byCode.map((o: any) => o.name)).toEqual(['Anil Nair']);
  });
});
