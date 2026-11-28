/**
 * Pay and bank details against a real database: effective-dated revisions
 * with server-derived totals, withdrawing only what has not started, the
 * account number and PAN sealed at rest and masked in every read, and each
 * reveal written to the worker history.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value])
  );
});

import { HrEmployeeModel } from '../../employee.model';
import { HrCompensationModel } from '../../compensation.model';
import { todayKey } from '../../employee.events';
import { hire, M, PAY, person, Q, stubRoleTransactions } from '../hr.fixtures';

const dayFrom = (days: number) => {
  const d = new Date(`${todayKey()}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const raise = (effective_from: string, basic: number, reason = 'REVISION') => ({
  currency: 'INR',
  effective_from,
  reason,
  note: 'Annual review',
  components: [
    { label: 'Basic', type: 'EARNING', monthly_amount: basic },
    { label: 'Employee PF', type: 'DEDUCTION', monthly_amount: 1800 },
  ],
});

beforeAll(async () => {
  await HrEmployeeModel.syncIndexes();
  await HrCompensationModel.syncIndexes();
}, 60_000);

stubRoleTransactions();

describe('pay revisions', () => {
  it('keeps every revision, marks the one in force today and the upcoming one', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const { employee } = await hire(hr, await person('Meera', ['USER']));
    const now = await M.addHrCompensation({}, { employee_id: employee.id, input: raise(dayFrom(-1), 60000) }, hr);
    expect(now).toMatchObject({ is_current: true, is_upcoming: false, totals: { gross_monthly: 60000, net_monthly: 58200, annual_ctc: 720000 } });
    const later = await M.addHrCompensation({}, { employee_id: employee.id, input: raise(dayFrom(30), 70000, 'PROMOTION') }, hr);
    expect(later).toMatchObject({ is_current: false, is_upcoming: true });

    const profile = await Q.hrEmployee({}, { id: employee.id }, hr);
    expect(profile.compensation.map((c: any) => c.effective_from)).toEqual([dayFrom(30), dayFrom(-1), PAY.effective_from]);
    expect(profile.current_compensation.id).toBe(now.id);

    const [event] = await Q.hrEmployeeHistory({}, { id: employee.id }, hr);
    expect(event).toMatchObject({ kind: 'COMPENSATION_ADDED', changes: [{ field: 'compensation', from: 'INR 720000.00 CTC', to: 'INR 840000.00 CTC' }] });
  });

  it('refuses two revisions on the same day, a HIRE reason, and a line set without an earning', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const { employee } = await hire(hr, await person('Meera', ['USER']));
    const add = (input: unknown) => M.addHrCompensation({}, { employee_id: employee.id, input }, hr);
    await expect(add(raise(PAY.effective_from, 50000))).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    await expect(add(raise(dayFrom(1), 50000, 'HIRE'))).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(add({ ...raise(dayFrom(1), 0) })).rejects.toThrow('at least one earning above zero');
    await expect(
      add({ ...raise(dayFrom(1), 50000), components: [{ label: 'Bonus', type: 'DEDUCTION', monthly_amount: 10, target_linked: true }] })
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('withdraws only a revision that has not started', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const { employee, current_compensation } = await hire(hr, await person('Meera', ['USER']));
    const upcoming = await M.addHrCompensation({}, { employee_id: employee.id, input: raise(dayFrom(10), 70000) }, hr);
    await expect(M.removeHrCompensation({}, { id: current_compensation.id }, hr)).rejects.toThrow('already in force');
    expect(await M.removeHrCompensation({}, { id: upcoming.id }, hr)).toBe(true);
    expect(await HrCompensationModel.countDocuments({ employee_id: employee.id })).toBe(1);
    const [event] = await Q.hrEmployeeHistory({}, { id: employee.id }, hr);
    expect(event.kind).toBe('COMPENSATION_REMOVED');
  });
});

describe('bank and statutory details', () => {
  const BANK = { account_holder_name: 'Meera Nair', account_number: '123456789012', ifsc: 'hdfc0001234', bank_name: 'HDFC', pan: 'abcde1234f', uan: '100123456789' };

  it('seals the account number and PAN, masks them in reads, and reveals them with a history row', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const { employee } = await hire(hr, await person('Meera', ['USER']), { bank: BANK });

    const stored = await HrEmployeeModel.findById(employee.id).lean<any>();
    expect(stored.bank.account_number_sealed).toMatch(/^enc:/);
    expect(stored.bank.pan_sealed).toMatch(/^enc:/);
    expect(JSON.stringify(stored.bank)).not.toContain('123456789012');
    expect(employee.bank).toEqual({
      account_holder_name: 'Meera Nair',
      account_number_masked: '•••• 9012',
      ifsc: 'HDFC0001234',
      bank_name: 'HDFC',
      pan_masked: '•••• 234F',
      uan: '100123456789',
    });

    const full = await Q.hrEmployeeBankDetails({}, { id: employee.id }, hr);
    expect(full).toMatchObject({ account_number: '123456789012', pan: 'ABCDE1234F', ifsc: 'HDFC0001234' });
    const [event] = await Q.hrEmployeeHistory({}, { id: employee.id }, hr);
    expect(event).toMatchObject({ kind: 'BANK_VIEWED', actor: { name: 'Asha Iyer' } });
  });

  it('keeps a stored secret the save left out, clears one sent empty, and never logs values', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const { employee } = await hire(hr, await person('Meera', ['USER']), { bank: BANK });
    const saved = await M.updateHrEmployeeBank(
      {},
      { id: employee.id, input: { account_holder_name: 'Meera N', ifsc: 'ICIC0000001', bank_name: 'ICICI', pan: '', uan: '100123456789' }, expected_revision: employee.revision },
      hr
    );
    expect(saved.bank).toMatchObject({ account_number_masked: '•••• 9012', pan_masked: null, ifsc: 'ICIC0000001' });

    const [event] = await Q.hrEmployeeHistory({}, { id: employee.id }, hr);
    expect(event.kind).toBe('BANK_UPDATED');
    expect(event.changes.map((c: any) => c.field)).toEqual(expect.arrayContaining(['bank.account_holder_name', 'bank.ifsc', 'bank.pan']));
    expect(JSON.stringify(event.changes)).not.toContain('ABCDE1234F');
  });

  it('refuses a malformed IFSC, PAN or account number', async () => {
    const hr = await person('Asha', ['HR_MANAGER']);
    const { employee } = await hire(hr, await person('Meera', ['USER']));
    const save = (input: unknown) => M.updateHrEmployeeBank({}, { id: employee.id, input, expected_revision: employee.revision }, hr);
    await expect(save({ ifsc: 'HDFC1234' })).rejects.toMatchObject({ extensions: { fields: ['ifsc'] } });
    await expect(save({ pan: 'ABC123' })).rejects.toMatchObject({ extensions: { fields: ['pan'] } });
    await expect(save({ account_number: '12ab' })).rejects.toMatchObject({ extensions: { fields: ['account_number'] } });
  });
});
