import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { HrJobRecord } from '@duncit/utils';
import { renderWithProviders } from '../../../../../../__tests__/testkit';
import { HR_MANAGER_OPTIONS } from '../../../../../lib/employee-queries';
import { JobChangeForm, jobChangeSchema } from '.';

type Translate = Parameters<typeof jobChangeSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const JOB: HrJobRecord = {
  job_title: 'Analyst',
  department: 'Growth',
  work_location: null,
  manager_id: null,
  manager: null,
  employment_type: 'FULL_TIME',
  date_of_joining: '2026-01-05',
  probation_end_date: null,
  notice_period_days: 30,
  work_email: null,
};

const managers: MockedResponse = {
  request: { query: HR_MANAGER_OPTIONS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { hrManagerOptions: [] } },
};

describe('jobChangeSchema', () => {
  const values = { job: { ...JOB, department: 'Growth', work_location: '', probation_end_date: '', notice_period_days: '30', work_email: '' }, reason: 'PROMOTION', effective_date: '2026-11-28', note: '' };

  it('refuses a change dated after today', () => {
    const result = jobChangeSchema(t, '2026-11-27').safeParse(values);
    expect(result.success ? [] : result.error.issues.map((i) => i.message)).toEqual(['hrEmployee.form.futureNotAllowed']);
  });

  it('maps a valid change to HrJobChangeInput with a null note when empty', () => {
    expect(jobChangeSchema(t, '2026-11-28').parse(values)).toMatchObject({ reason: 'PROMOTION', effective_date: '2026-11-28', note: null, job: { job_title: 'Analyst', manager_id: null } });
  });
});

describe('JobChangeForm', () => {
  it('records the new title with the reason and effective date', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<JobChangeForm employeeId="e1" job={JOB} settings={null} onSubmit={onSubmit} onCancel={vi.fn()} />, { mocks: [managers] });
    fireEvent.change(screen.getByTestId('hr-job-title'), { target: { value: 'Senior Analyst' } });
    fireEvent.change(screen.getByTestId('hr-job-note'), { target: { value: 'Strong year' } });
    fireEvent.click(screen.getByTestId('hr-job-form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ reason: 'PROMOTION', note: 'Strong year', job: { job_title: 'Senior Analyst', department: 'Growth' } });
    expect(onSubmit.mock.calls[0][0].effective_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('will not save an empty job title', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<JobChangeForm employeeId="e1" job={JOB} settings={null} onSubmit={onSubmit} onCancel={vi.fn()} />, { mocks: [managers] });
    fireEvent.change(screen.getByTestId('hr-job-title'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('hr-job-form-submit'));
    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
