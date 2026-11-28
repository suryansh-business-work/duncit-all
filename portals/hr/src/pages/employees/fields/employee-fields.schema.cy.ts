import { describe, expect, it } from 'vitest';
import { bankSchema, jobSchema, paySchema, personalSchema } from './employee-fields.schema';
import { EMPTY_BANK, EMPTY_PERSONAL, bankValuesFrom, emptyJob, emptyPay, payValuesFrom, suggestedProbationEnd } from './employee-fields.defaults';
import type { Translate } from './employee-fields.types';

const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;
const TODAY = '2026-11-28';

const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}:${issue.message}`);

describe('personalSchema', () => {
  const base = { ...EMPTY_PERSONAL, first_name: ' Meera ', last_name: 'Nair' };

  it('maps the form to HrPersonalInput: trimmed names, blanks to null', () => {
    expect(personalSchema(t, TODAY).parse({ ...base, gender: 'FEMALE', date_of_birth: '1995-06-15' })).toEqual({
      first_name: 'Meera',
      last_name: 'Nair',
      gender: 'FEMALE',
      date_of_birth: '1995-06-15',
      personal_email: null,
      phone_number: null,
      phone_extension: '+91',
      current_address: null,
      permanent_address: null,
      emergency_contact: null,
    });
  });

  it('requires both names and refuses a birth date in the future or under the minimum age', () => {
    expect(messages(personalSchema(t, TODAY).safeParse({ ...base, first_name: '' }))).toEqual(['first_name:hrEmployee.form.required']);
    expect(messages(personalSchema(t, TODAY).safeParse({ ...base, date_of_birth: '2027-01-01' }))).toEqual(['date_of_birth:hrEmployee.hint.dateOfBirth:14']);
    expect(messages(personalSchema(t, TODAY).safeParse({ ...base, date_of_birth: '2015-01-01' }))).toEqual(['date_of_birth:hrEmployee.hint.dateOfBirth:14']);
    expect(messages(personalSchema(t, TODAY).safeParse({ ...base, date_of_birth: '2012-11-28' }))).toEqual([]);
  });
});

describe('jobSchema', () => {
  const job = { ...emptyJob({ default_notice_period_days: 30 }), job_title: 'Analyst', date_of_joining: '2026-03-01' };

  it('maps the form to HrJobInput, the manager to its id and the notice to a number', () => {
    const manager = { id: 'm1', employee_code: 'E-1', name: 'Kiran', job_title: null };
    expect(jobSchema(t).parse({ ...job, manager, department: ' Ops ', work_email: 'A@Duncit.com' })).toEqual({
      job_title: 'Analyst',
      department: 'Ops',
      work_location: null,
      manager_id: 'm1',
      employment_type: 'FULL_TIME',
      date_of_joining: '2026-03-01',
      probation_end_date: null,
      notice_period_days: 30,
      work_email: 'a@duncit.com',
    });
  });

  it('refuses a probation ending before joining, a bad notice period and a missing joining date', () => {
    expect(messages(jobSchema(t).safeParse({ ...job, probation_end_date: '2026-02-01' }))).toEqual(['probation_end_date:hrEmployee.form.probationBeforeJoining']);
    expect(messages(jobSchema(t).safeParse({ ...job, notice_period_days: '400' }))).toEqual(['notice_period_days:hrEmployee.form.noticeInvalid:365']);
    expect(messages(jobSchema(t).safeParse({ ...job, date_of_joining: '' }))).toEqual(['date_of_joining:hrEmployee.form.dateInvalid']);
  });

  it('suggests a probation end from the joining date and the settings months', () => {
    expect(suggestedProbationEnd('2026-01-31', 1)).toBe('2026-02-28');
    expect(suggestedProbationEnd('', 3)).toBe('');
    expect(suggestedProbationEnd('2026-01-31', 0)).toBe('');
  });
});

describe('paySchema', () => {
  const pay = { ...emptyPay('inr', '2026-03-01', 'REVISION'), lines: [{ label: 'Basic', type: 'EARNING' as const, monthly_amount: '40000', target_linked: false }] };

  it('maps the form to HrCompensationInput: numbers, uppercase currency, the CTC helper dropped', () => {
    expect(paySchema(t).parse({ ...pay, annual_ctc: '480000', note: '' })).toEqual({
      currency: 'INR',
      effective_from: '2026-03-01',
      reason: 'REVISION',
      note: null,
      components: [{ label: 'Basic', type: 'EARNING', monthly_amount: 40000, target_linked: false }],
    });
  });

  it('needs an earning above zero, a valid amount and target links only on earnings', () => {
    expect(messages(paySchema(t).safeParse({ ...pay, lines: [{ ...pay.lines[0], type: 'DEDUCTION' }] }))).toEqual(['lines:hrEmployee.form.earningRequired']);
    expect(messages(paySchema(t).safeParse({ ...pay, lines: [{ ...pay.lines[0], monthly_amount: 'abc' }] }))).toContain('lines.0.monthly_amount:hrEmployee.form.amountInvalid:100000000');
    const linked = [pay.lines[0], { label: 'PF', type: 'DEDUCTION' as const, monthly_amount: '10', target_linked: true }];
    expect(messages(paySchema(t).safeParse({ ...pay, lines: linked }))).toEqual(['lines.1.target_linked:hrEmployee.form.targetOnlyEarning']);
  });

  it('seeds a new revision from the one in force', () => {
    const current = {
      id: 'c1',
      currency: 'INR',
      effective_from: '2026-01-01',
      reason: 'HIRE' as const,
      note: null,
      components: [{ label: 'Basic', type: 'EARNING' as const, monthly_amount: 50000, target_linked: false }],
      totals: { gross_monthly: 50000, fixed_gross_monthly: 50000, variable_monthly: 0, deductions_monthly: 0, employer_monthly: 0, net_monthly: 50000, annual_ctc: 600000 },
      is_current: true,
      is_upcoming: false,
      created_by: { user_id: 'u', name: 'Asha' },
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(payValuesFrom(current, TODAY)).toMatchObject({ effective_from: TODAY, reason: 'REVISION', annual_ctc: '600000', lines: [{ label: 'Basic', monthly_amount: '50000' }] });
  });
});

describe('bankSchema', () => {
  const filled = { account_holder_name: 'Meera', account_number: '123456789012', ifsc: 'hdfc0001234', bank_name: 'HDFC', pan: 'abcde1234f', uan: '100123456789' };

  it('uppercases IFSC and PAN and sends every field for a first entry', () => {
    expect(bankSchema(t).parse(filled)).toEqual({ ...filled, ifsc: 'HDFC0001234', pan: 'ABCDE1234F' });
  });

  it('leaves out an empty account number or PAN when one is stored, so the server keeps it', () => {
    const parsed = bankSchema(t, { account: true, pan: true }).parse({ ...EMPTY_BANK, ifsc: 'HDFC0001234' });
    expect(parsed).not.toHaveProperty('account_number');
    expect(parsed).not.toHaveProperty('pan');
    expect(bankSchema(t).parse(EMPTY_BANK)).toMatchObject({ account_number: '', pan: '' });
  });

  it('refuses malformed identifiers', () => {
    expect(messages(bankSchema(t).safeParse({ ...EMPTY_BANK, ifsc: 'HDFC1234' }))).toEqual(['ifsc:hrEmployee.form.ifscInvalid']);
    expect(messages(bankSchema(t).safeParse({ ...EMPTY_BANK, pan: 'ABC' }))).toEqual(['pan:hrEmployee.form.panInvalid']);
    expect(messages(bankSchema(t).safeParse({ ...EMPTY_BANK, uan: '12' }))).toEqual(['uan:hrEmployee.form.uanInvalid']);
    expect(messages(bankSchema(t).safeParse({ ...EMPTY_BANK, account_number: '12ab' }))).toEqual(['account_number:hrEmployee.form.accountNumberInvalid']);
  });

  it('fills the form from the masked summary without the sealed values', () => {
    expect(bankValuesFrom({ account_holder_name: 'M', account_number_masked: '•••• 9012', ifsc: 'X', bank_name: null, pan_masked: '•••• 234F', uan: null })).toEqual({
      ...EMPTY_BANK,
      account_holder_name: 'M',
      ifsc: 'X',
    });
  });
});
