import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { GeneralSection } from '../../../../pages/settings/settings/GeneralSection';
import { settingsValuesFrom, type SettingsFormValues } from '../../../../pages/settings/settings';
import { makeSettings } from '../../../fixtures';

function Harness({ busy = false }: Readonly<{ busy?: boolean }>) {
  const { control } = useForm<SettingsFormValues>({ defaultValues: settingsValuesFrom(makeSettings()) });
  return <GeneralSection control={control} busy={busy} />;
}

const FIELDS = [
  ['settings-site-name', /Site name/, 'Duncit Lite', 'Shown in the app header and in emails'],
  ['settings-support-email', /Support email/, 'help@lite.example', 'Where the footer link and replies go'],
  ['settings-currency', /Currency/, 'INR', 'ISO code, for example INR'],
  ['settings-max-ticket-price', /Maximum ticket price/, '50000', 'Whole rupees. 0 means no ceiling.'],
  ['settings-max-event-capacity', /Largest event capacity/, '5000', 'The most seats a host may offer on one event'],
  ['settings-max-seats', /Seats per registration/, '10', 'The most seats one guest may take at once (1 to 100)'],
] as const;

describe('GeneralSection', () => {
  it('titles the section General', () => {
    render(<Harness />);
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it.each(FIELDS)('labels %s, fills it from the form and explains it', (testId, label, value, hint) => {
    render(<Harness />);
    const input = screen.getByTestId(testId);
    expect(screen.getByLabelText(label)).toBe(input);
    expect(input).toHaveValue(value);
    expect(input).toBeRequired();
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it('opens a numeric keypad for the three number limits', () => {
    render(<Harness />);
    for (const testId of ['settings-max-ticket-price', 'settings-max-event-capacity', 'settings-max-seats']) {
      expect(screen.getByTestId(testId)).toHaveAttribute('inputmode', 'numeric');
    }
  });

  it('keeps the currency to three characters', () => {
    render(<Harness />);
    expect(screen.getByTestId('settings-currency')).toHaveAttribute('maxlength', '3');
  });

  it('locks every field while a save is running', () => {
    render(<Harness busy />);
    for (const [testId] of FIELDS) expect(screen.getByTestId(testId)).toBeDisabled();
  });
});
