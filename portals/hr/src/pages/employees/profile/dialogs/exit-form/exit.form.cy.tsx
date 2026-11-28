import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../__tests__/testkit';
import { ExitForm, exitSchema } from '.';

type Translate = Parameters<typeof exitSchema>[0];
const t = ((key: string) => key) as Translate;

const values = { exit_type: 'RESIGNATION', resignation_date: '', last_working_day: '2026-12-31', reason: '', eligible_for_rehire: true };
const issues = (over: Record<string, unknown>) => {
  const result = exitSchema(t, '2026-01-05').safeParse({ ...values, ...over });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('exitSchema', () => {
  it('maps blanks to null', () => {
    expect(exitSchema(t, '2026-01-05').parse(values)).toEqual({ ...values, resignation_date: null, reason: null });
  });

  it('refuses a last day before the resignation or before joining, and a missing last day', () => {
    expect(issues({ resignation_date: '2027-01-10' })).toEqual(['hrEmployee.form.lastDayBeforeResignation']);
    expect(issues({ last_working_day: '2025-12-31' })).toEqual(['hrEmployee.form.lastDayBeforeJoining']);
    expect(issues({ last_working_day: '' })).toEqual(['hrEmployee.form.dateInvalid']);
  });
});

describe('ExitForm', () => {
  it('offers the end of the notice period and records the exit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<ExitForm dateOfJoining="2026-01-05" suggestedLastDay="2026-12-28" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('hr-exit-reason'), { target: { value: 'Moving cities' } });
    fireEvent.click(screen.getByTestId('hr-exit-form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      exit_type: 'RESIGNATION',
      resignation_date: null,
      last_working_day: '2026-12-28',
      reason: 'Moving cities',
      eligible_for_rehire: true,
    });
  });
});
