import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EMPLOYEE_TARGET_LIMITS } from '@duncit/utils';
import { SubmitTargetForm, submitTargetSchema, valuesFromTarget } from '.';
import { makeSubmission, makeTarget } from '../../../../__tests__/mocks/target.mock';

type Translate = Parameters<typeof submitTargetSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const valid = { completion_percent: 70, achievements: [{ title: 'Closed 12 venues', details: '' }], updates: '' };
const issues = (values: unknown) => {
  const result = submitTargetSchema(t).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

const field = (id: string) => screen.getByTestId(id) as HTMLInputElement;

function renderForm(target = makeTarget(), onSubmit = vi.fn().mockResolvedValue(true)) {
  render(<SubmitTargetForm target={target} onSubmit={onSubmit} />);
  return onSubmit;
}

describe('submitTargetSchema', () => {
  it('accepts 0 and 100 and trims the rows', () => {
    expect(issues({ ...valid, completion_percent: 0 })).toEqual([]);
    expect(issues({ ...valid, completion_percent: 100 })).toEqual([]);
    expect(
      submitTargetSchema(t).parse({ ...valid, achievements: [{ title: '  Won  ', details: ' x ' }], updates: ' u ' })
    ).toEqual({ completion_percent: 70, achievements: [{ title: 'Won', details: 'x' }], updates: 'u' });
  });

  it('refuses a percent outside 0–100, with decimals or empty', () => {
    for (const bad of [-1, 101, 50.5, Number.NaN]) {
      expect(issues({ ...valid, completion_percent: bad })).toEqual(['employeeTargets.submitForm.percentInvalid']);
    }
  });

  it('needs at least one titled achievement and stays inside the server limits', () => {
    expect(issues({ ...valid, achievements: [] })).toEqual(['employeeTargets.submitForm.achievementsMin']);
    expect(issues({ ...valid, achievements: [{ title: ' ', details: '' }] })).toEqual([
      'employeeTargets.submitForm.achievementTitleRequired',
    ]);
    const many = Array.from({ length: EMPLOYEE_TARGET_LIMITS.achievementsMax + 1 }, () => ({ title: 'a', details: '' }));
    expect(issues({ ...valid, achievements: many })).toEqual([
      `employeeTargets.submitForm.achievementsMax:${EMPLOYEE_TARGET_LIMITS.achievementsMax}`,
    ]);
    expect(issues({ ...valid, updates: 'u'.repeat(EMPLOYEE_TARGET_LIMITS.updatesMax + 1) })).toEqual([
      `employeeTargets.form.tooLong:${EMPLOYEE_TARGET_LIMITS.updatesMax}`,
    ]);
  });

  it('seeds a fresh report with one empty row, and a corrected one with the earlier report', () => {
    expect(valuesFromTarget(makeTarget())).toEqual({ completion_percent: 0, achievements: [{ title: '', details: '' }], updates: '' });
    expect(valuesFromTarget(makeTarget({ submission: makeSubmission() }))).toEqual({
      completion_percent: 80,
      achievements: [{ title: 'Signed 32 venues', details: 'Indiranagar and HSR' }],
      updates: 'Two more in legal review',
    });
  });
});

describe('SubmitTargetForm', () => {
  it('submits the percent, every achievement row and the updates', async () => {
    const onSubmit = renderForm();
    fireEvent.change(field('submit-target-percent'), { target: { value: '85' } });
    fireEvent.change(field('submit-target-title-0'), { target: { value: 'Signed 30 venues' } });
    fireEvent.click(screen.getByTestId('submit-target-add'));
    fireEvent.change(field('submit-target-title-1'), { target: { value: 'Ran 12 pods' } });
    fireEvent.change(field('submit-target-details-1'), { target: { value: 'Weekend mornings' } });
    fireEvent.change(field('submit-target-updates'), { target: { value: 'On track' } });
    fireEvent.click(screen.getByTestId('submit-target-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          completion_percent: 85,
          achievements: [
            { title: 'Signed 30 venues', details: '' },
            { title: 'Ran 12 pods', details: 'Weekend mornings' },
          ],
          updates: 'On track',
        },
        expect.anything()
      )
    );
  });

  it('refuses an empty percent box and an untitled achievement, sending nothing', async () => {
    const onSubmit = renderForm();
    fireEvent.change(field('submit-target-percent'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('submit-target-submit'));
    expect(await screen.findByText('Enter a whole number from 0 to 100')).toBeInTheDocument();
    expect(screen.getByText('Give the achievement a title')).toBeInTheDocument();
    expect(field('submit-target-percent').value).toBe('');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the last achievement row and removes the others', () => {
    renderForm();
    expect(screen.getByTestId('submit-target-remove-0')).toBeDisabled();
    fireEvent.click(screen.getByTestId('submit-target-add'));
    expect(screen.getAllByTestId('submit-target-achievement')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('submit-target-remove-1'));
    expect(screen.getAllByTestId('submit-target-achievement')).toHaveLength(1);
  });

  it('moves the slider and the number box together', () => {
    renderForm();
    fireEvent.change(field('submit-target-percent'), { target: { value: '40' } });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '40%');
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(field('submit-target-percent').value).toBe('41');
  });

  it('opens a report already sent with its values, offering to update it', () => {
    renderForm(makeTarget({ status: 'SUBMITTED', submission: makeSubmission() }));
    expect(field('submit-target-percent').value).toBe('80');
    expect(field('submit-target-title-0').value).toBe('Signed 32 venues');
    expect(screen.getByTestId('submit-target-submit')).toHaveTextContent('Update report');
  });
});
