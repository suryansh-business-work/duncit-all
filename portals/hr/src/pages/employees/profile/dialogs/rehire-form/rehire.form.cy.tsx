import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { HrJobRecord } from '@duncit/utils';
import { renderWithProviders } from '../../../../../../__tests__/testkit';
import { HR_MANAGER_OPTIONS } from '../../../../../lib/employee-queries';
import { RehireForm, rehireSchema } from '.';

type Translate = Parameters<typeof rehireSchema>[0];
const t = ((key: string) => key) as Translate;

const JOB: HrJobRecord = {
  job_title: 'Analyst',
  department: null,
  work_location: null,
  manager_id: null,
  manager: null,
  employment_type: 'CONTRACT',
  date_of_joining: '2025-01-05',
  probation_end_date: '2025-04-05',
  notice_period_days: 15,
  work_email: null,
};

const managers: MockedResponse = {
  request: { query: HR_MANAGER_OPTIONS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { hrManagerOptions: [] } },
};

const jobValues = (joining: string) => ({ ...JOB, department: '', work_location: '', probation_end_date: '', notice_period_days: '15', work_email: '', date_of_joining: joining });

describe('rehireSchema', () => {
  it('needs a new joining date after the last working day', () => {
    const result = rehireSchema(t, '2026-06-30').safeParse({ job: jobValues('2026-06-30'), note: '' });
    expect(result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`)).toEqual(['job.date_of_joining:hrEmployee.form.rejoinAfterExit']);
  });

  it('maps a valid rehire to HrRehireInput', () => {
    expect(rehireSchema(t, '2026-06-30').parse({ job: jobValues('2026-07-15'), note: ' Welcome back ' })).toMatchObject({
      note: 'Welcome back',
      job: { date_of_joining: '2026-07-15', employment_type: 'CONTRACT', notice_period_days: 15 },
    });
  });
});

describe('RehireForm', () => {
  it('starts from the old job with the joining date cleared, and asks for one', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<RehireForm employeeId="e1" job={JOB} lastWorkingDay="2026-06-30" settings={null} onSubmit={onSubmit} onCancel={vi.fn()} />, { mocks: [managers] });
    expect(screen.getByTestId('hr-job-title')).toHaveValue('Analyst');
    fireEvent.click(screen.getByTestId('hr-rehire-form-submit'));
    expect(await screen.findAllByText('Choose a valid date')).not.toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
