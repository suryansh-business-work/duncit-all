import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { HrSettingsRecord } from '@duncit/utils';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { HrSettingsForm, hrSettingsSchema, valuesFromSettings } from '.';

type Translate = Parameters<typeof hrSettingsSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const SETTINGS: HrSettingsRecord = {
  employee_code_prefix: 'EMP',
  employee_code_digits: 4,
  next_employee_code: 'EMP-0007',
  default_currency: 'INR',
  default_notice_period_days: 30,
  default_probation_months: 3,
  departments: ['Growth'],
  work_locations: [],
  salary_template: [{ label: 'Basic', type: 'EARNING', calc: 'PERCENT_OF_CTC', value: 40, target_linked: false }],
  updated_at: null,
};

const issues = (over: Record<string, unknown>) => {
  const result = hrSettingsSchema(t).safeParse({ ...valuesFromSettings(SETTINGS), ...over });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('hrSettingsSchema', () => {
  it('turns the form into the API input: numbers, uppercase codes, lists without blanks', () => {
    const parsed = hrSettingsSchema(t).parse({
      ...valuesFromSettings(SETTINGS),
      employee_code_prefix: ' dun ',
      default_currency: 'usd',
      departments: [{ value: 'Growth' }, { value: '  ' }, { value: 'Ops' }],
    });
    expect(parsed).toMatchObject({
      employee_code_prefix: 'DUN',
      employee_code_digits: 4,
      default_currency: 'USD',
      default_notice_period_days: 30,
      departments: ['Growth', 'Ops'],
      salary_template: [{ label: 'Basic', type: 'EARNING', calc: 'PERCENT_OF_CTC', value: 40, target_linked: false }],
    });
  });

  it('refuses a bad prefix, digits out of range and a non-ISO currency', () => {
    expect(issues({ employee_code_prefix: 'E-1' })).toEqual(['hrEmployee.settings.prefixInvalid:10']);
    expect(issues({ employee_code_digits: '9' })).toEqual(['hrEmployee.settings.digitsInvalid:2|8']);
    expect(issues({ default_currency: 'RUPEE' })).toEqual(['hrEmployee.form.currencyInvalid']);
    expect(issues({ default_notice_period_days: '-1' })).toEqual(['hrEmployee.settings.rangeInvalid:0|365']);
  });

  it('keeps the salary template rules: a basic first, percents to 100, one balance on an earning', () => {
    const row = (calc: string, value = '10', type = 'EARNING') => ({ label: calc, type, calc, value, target_linked: false });
    expect(issues({ salary_template: [row('BALANCE', '0')] })).toEqual(['hrEmployee.settings.templateFirstLine']);
    expect(issues({ salary_template: [row('PERCENT_OF_CTC', '120')] })).toEqual(['hrEmployee.settings.percentMax:100']);
    expect(issues({ salary_template: [row('FIXED'), row('BALANCE', ''), row('BALANCE', '')] })).toEqual(['hrEmployee.settings.templateOneBalance']);
    expect(issues({ salary_template: [row('FIXED'), row('BALANCE', '', 'DEDUCTION')] })).toEqual(['hrEmployee.settings.templateBalanceEarning']);
    expect(issues({ salary_template: [{ ...row('FIXED', '100', 'DEDUCTION'), target_linked: true }] })).toEqual(['hrEmployee.form.targetOnlyEarning']);
  });
});

describe('HrSettingsForm', () => {
  it('previews the next code from the prefix and digits being typed, keeping the server sequence', () => {
    renderWithProviders(<HrSettingsForm settings={SETTINGS} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('hr-settings-next-code')).toHaveTextContent('EMP-0007');
    fireEvent.change(screen.getByTestId('hr-settings-prefix'), { target: { value: 'dn' } });
    fireEvent.change(screen.getByTestId('hr-settings-digits'), { target: { value: '6' } });
    expect(screen.getByTestId('hr-settings-next-code')).toHaveTextContent('DN-000007');
  });

  it('adds a department and saves the cleaned settings', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<HrSettingsForm settings={SETTINGS} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('hr-settings-departments-add'));
    fireEvent.change(screen.getByTestId('hr-settings-departments-1'), { target: { value: 'Sales' } });
    fireEvent.click(screen.getByTestId('hr-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ departments: ['Growth', 'Sales'], employee_code_prefix: 'EMP' });
  });

  it('does not save while a field is invalid', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<HrSettingsForm settings={SETTINGS} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('hr-settings-currency'), { target: { value: 'R' } });
    fireEvent.click(screen.getByTestId('hr-settings-save'));
    expect(await screen.findByText('Use a 3-letter currency code')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
