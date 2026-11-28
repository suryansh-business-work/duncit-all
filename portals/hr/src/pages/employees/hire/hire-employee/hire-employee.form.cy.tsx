import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { HrSettingsRecord } from '@duncit/utils';
import { renderWithProviders } from '../../../../../__tests__/testkit';
import { HireEmployeeForm, hireSchema, initialHireValues } from '.';
import type { HireFormValues } from './hire-employee.types';

type Translate = Parameters<typeof hireSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const SETTINGS: HrSettingsRecord = {
  employee_code_prefix: 'EMP',
  employee_code_digits: 4,
  next_employee_code: 'EMP-0001',
  default_currency: 'INR',
  default_notice_period_days: 30,
  default_probation_months: 3,
  departments: [],
  work_locations: [],
  salary_template: [],
  updated_at: null,
};

/** A complete, valid hire of an existing account. */
function valid(over: Partial<HireFormValues> = {}): HireFormValues {
  const base = initialHireValues(SETTINGS, { id: 'u1', name: 'Meera Nair', email: 'meera@x.com' });
  return {
    ...base,
    job: { ...base.job, job_title: 'Analyst', date_of_joining: '2026-03-01' },
    pay: { ...base.pay, effective_from: '2026-03-01', lines: [{ label: 'Basic', type: 'EARNING', monthly_amount: '40000', target_linked: false }] },
    ...over,
  };
}

const issues = (values: HireFormValues) => {
  const result = hireSchema(t).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('hireSchema', () => {
  it('turns an existing-account hire into HireHrEmployeeInput, the pay revision always HIRE', () => {
    const parsed = hireSchema(t).parse(valid({ employee_code: 'dn-7' }));
    expect(parsed).toMatchObject({
      account_user_id: 'u1',
      new_account: null,
      employee_code: 'DN-7',
      personal: { first_name: 'Meera', last_name: 'Nair' },
      job: { job_title: 'Analyst', date_of_joining: '2026-03-01', notice_period_days: 30 },
      compensation: { reason: 'HIRE', currency: 'INR', components: [{ label: 'Basic', monthly_amount: 40000 }] },
    });
  });

  it('opens a new account by email instead, and leaves the code to the server when empty', () => {
    const parsed = hireSchema(t).parse(valid({ account_mode: 'NEW', account: null, new_email: 'New@X.com', new_phone_number: '' }));
    expect(parsed).toMatchObject({ account_user_id: null, new_account: { email: 'new@x.com', phone_number: null }, employee_code: null });
  });

  it('asks for the account the chosen mode needs', () => {
    expect(issues(valid({ account: null }))).toEqual(['account:hrEmployee.form.accountRequired']);
    expect(issues(valid({ account_mode: 'NEW', new_email: 'nope' }))).toEqual(['new_email:hrEmployee.form.emailInvalid']);
  });

  it('checks pay only when HR adds it now, and never before the joining date', () => {
    const noPay = valid({ include_pay: false });
    expect(hireSchema(t).parse({ ...noPay, pay: { ...noPay.pay, lines: [] } }).compensation).toBeNull();
    expect(issues(valid({ pay: { ...valid().pay, effective_from: '2026-02-01' } }))).toEqual(['pay.effective_from:hrEmployee.form.payBeforeJoining']);
    expect(issues(valid({ pay: { ...valid().pay, lines: [] } }))).toEqual(['pay.lines:hrEmployee.form.earningRequired']);
  });

  it('refuses a code with spaces or symbols', () => {
    expect(issues(valid({ employee_code: 'E 1' }))).toEqual(['employee_code:hrEmployee.form.codeInvalid']);
  });
});

describe('HireEmployeeForm', () => {
  it('stays on the account step until an account is chosen', async () => {
    renderWithProviders(<HireEmployeeForm settings={SETTINGS} preset={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hr-hire-next'));
    expect(await screen.findByText('Pick an account')).toBeInTheDocument();
    expect(screen.getByTestId('hr-hire-account')).toBeInTheDocument();
  });

  it('moves on from a preset account to the personal step, its names already filled', async () => {
    renderWithProviders(<HireEmployeeForm settings={SETTINGS} preset={{ id: 'u1', name: 'Meera Nair', email: 'meera@x.com' }} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('hr-hire-code')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hr-hire-next'));
    await waitFor(() => expect(screen.getByTestId('hr-first-name')).toHaveValue('Meera'));
    expect(screen.getByTestId('hr-last-name')).toHaveValue('Nair');
    fireEvent.click(screen.getByTestId('hr-hire-back'));
    expect(await screen.findByTestId('hr-hire-code')).toBeInTheDocument();
  });

  it('asks for a new account email when hiring someone new to Duncit', async () => {
    renderWithProviders(<HireEmployeeForm settings={SETTINGS} preset={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('New to Duncit'));
    fireEvent.change(screen.getByTestId('hr-hire-new-email'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByTestId('hr-hire-next'));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('cancels from the first step', () => {
    const onCancel = vi.fn();
    renderWithProviders(<HireEmployeeForm settings={SETTINGS} preset={null} onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('hr-hire-back'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
