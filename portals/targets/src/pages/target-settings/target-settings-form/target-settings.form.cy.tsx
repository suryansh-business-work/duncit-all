import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TargetSettingsForm, targetSettingsSchema, toFormValues } from '.';

type Translate = Parameters<typeof targetSettingsSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const INITIAL = { reminders_enabled: true, reminder_days_before_end: 3, reminder_grace_days: 3 };
const box = (id: string) => screen.getByTestId(id) as HTMLInputElement;

const issues = (values: { reminders_enabled: boolean; reminder_days_before_end: string; reminder_grace_days: string }) => {
  const result = targetSettingsSchema(t).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('targetSettingsSchema', () => {
  it('reads both day counts as whole numbers inside the server ranges', () => {
    expect(targetSettingsSchema(t).parse(toFormValues(INITIAL))).toEqual(INITIAL);
    expect(issues({ reminders_enabled: true, reminder_days_before_end: '1', reminder_grace_days: '0' })).toEqual([]);
    expect(issues({ reminders_enabled: true, reminder_days_before_end: '15', reminder_grace_days: '15' })).toEqual([]);
  });

  it('refuses a blank, fractional or out-of-range count', () => {
    expect(issues({ reminders_enabled: true, reminder_days_before_end: '0', reminder_grace_days: '16' })).toEqual([
      'employeeTargets.settings.range:1|15',
      'employeeTargets.settings.range:0|15',
    ]);
    expect(issues({ reminders_enabled: true, reminder_days_before_end: '', reminder_grace_days: '1.5' })).toHaveLength(2);
  });
});

describe('TargetSettingsForm', () => {
  it('shows the saved window and only saves once something changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<TargetSettingsForm initial={INITIAL} onSubmit={onSubmit} />);
    expect(box('target-settings-days-before').value).toBe('3');
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByTestId('target-settings-save')).toBeDisabled();

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.change(box('target-settings-days-before'), { target: { value: '5' } });
    fireEvent.change(box('target-settings-grace'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('target-settings-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        { reminders_enabled: false, reminder_days_before_end: 5, reminder_grace_days: 0 },
        expect.anything()
      )
    );
  });

  it('names the allowed range instead of saving a value outside it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<TargetSettingsForm initial={INITIAL} onSubmit={onSubmit} />);
    fireEvent.change(box('target-settings-days-before'), { target: { value: '40' } });
    fireEvent.click(screen.getByTestId('target-settings-save'));
    expect(await screen.findByText('Enter a whole number from 1 to 15')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
