import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import MyHrRecordPage from '../../src/pages/my-record/MyHrRecordPage';
import { MY_HR_PROFILE } from '../../src/pages/my-record/queries';
import { renderWithProviders } from '../testkit';

const employee = {
  __typename: 'HrEmployee',
  id: 'e1',
  user_id: 'u1',
  employee_code: 'EMP-0001',
  status: 'ACTIVE',
  full_name: 'Meera Nair',
  account_email: null,
  personal: {
    __typename: 'HrPersonal',
    first_name: 'Meera',
    last_name: 'Nair',
    gender: null,
    date_of_birth: null,
    personal_email: null,
    phone_number: null,
    phone_extension: '+91',
    current_address: null,
    permanent_address: null,
    emergency_contact: null,
  },
  job: {
    __typename: 'HrJob',
    job_title: 'Community Manager',
    department: 'Growth',
    work_location: null,
    manager_id: 'e0',
    manager: { __typename: 'HrEmployeeRef', id: 'e0', employee_code: 'EMP-0000', name: 'Kiran Rao', job_title: 'Head of Growth' },
    employment_type: 'FULL_TIME',
    date_of_joining: '2026-01-05',
    probation_end_date: null,
    notice_period_days: 30,
    work_email: null,
  },
  bank: { __typename: 'HrBankSummary', account_holder_name: 'Meera Nair', account_number_masked: '•••• 9012', ifsc: 'HDFC0001234', bank_name: 'HDFC', pan_masked: null, uan: null },
  exit: null,
  revision: 2,
  created_at: '2026-01-05T10:00:00.000Z',
  updated_at: '2026-01-05T10:00:00.000Z',
};

const pay = {
  __typename: 'HrCompensation',
  id: 'c1',
  currency: 'INR',
  effective_from: '2026-01-05',
  reason: 'HIRE',
  note: null,
  components: [{ __typename: 'HrPayLine', label: 'Target incentive', type: 'EARNING', monthly_amount: 10000, target_linked: true }],
  totals: { __typename: 'HrCompensationTotals', gross_monthly: 10000, fixed_gross_monthly: 0, variable_monthly: 10000, deductions_monthly: 0, employer_monthly: 0, net_monthly: 10000, annual_ctc: 120000 },
  is_current: true,
  is_upcoming: false,
  created_by: { __typename: 'HrActor', user_id: 'u-hr', name: 'Asha' },
  created_at: '2026-01-05T10:00:00.000Z',
};

const mock = (myHrProfile: unknown): MockedResponse => ({
  request: { query: MY_HR_PROFILE },
  result: { data: { myHrProfile } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

describe('MyHrRecordPage', () => {
  it('says HR has not added the record yet when there is none', async () => {
    renderWithProviders(<MyHrRecordPage />, { mocks: [mock(null)] });
    expect(await screen.findByTestId('my-record-empty')).toHaveTextContent('HR has not added your record yet');
  });

  it('shows my job, my pay with its target-linked line, masked bank details and my contact form', async () => {
    renderWithProviders(<MyHrRecordPage />, { mocks: [mock({ __typename: 'MyHrProfile', employee, current_compensation: pay })] });
    expect(await screen.findByText('Community Manager')).toBeInTheDocument();
    expect(screen.getByText('Kiran Rao')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Target incentive/ })).getByText('Target-linked')).toBeInTheDocument();
    expect(screen.getByText('•••• 9012')).toBeInTheDocument();
    expect(screen.getByText('To change your bank details, contact HR.')).toBeInTheDocument();
    expect(screen.getByTestId('my-contact-form')).toBeInTheDocument();
  });

  it('marks the record read-only after an exit', async () => {
    const exited = {
      ...employee,
      status: 'EXITED',
      exit: { __typename: 'HrExit', exit_type: 'RESIGNATION', resignation_date: null, last_working_day: '2026-06-30', reason: null, eligible_for_rehire: true, recorded_by: { __typename: 'HrActor', user_id: 'u', name: 'Asha' }, recorded_at: '2026-06-01T00:00:00Z' },
    };
    renderWithProviders(<MyHrRecordPage />, { mocks: [mock({ __typename: 'MyHrProfile', employee: exited, current_compensation: null })] });
    expect(await screen.findByText(/Your employment ended on/)).toBeInTheDocument();
    expect(screen.getByText('HR has not recorded your pay yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('my-contact-save')).not.toBeInTheDocument();
  });
});
