import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { IntegrationsSection } from '../../../../pages/settings/settings/IntegrationsSection';
import { settingsValuesFrom, type SettingsFormValues } from '../../../../pages/settings/settings';
import { makeSettings } from '../../../fixtures';

function Harness({ busy = false }: Readonly<{ busy?: boolean }>) {
  const { control, watch } = useForm<SettingsFormValues>({ defaultValues: settingsValuesFrom(makeSettings({ sign_in_with_phone: false })) });
  return (
    <>
      <IntegrationsSection control={control} busy={busy} />
      <output data-testid="phone-value">{String(watch('sign_in_with_phone'))}</output>
    </>
  );
}

describe('IntegrationsSection', () => {
  it('groups the settings under Duncit sign-in, Reminders, Payments and Admins', () => {
    render(<Harness />);
    for (const title of ['Duncit sign-in', 'Reminders', 'Payments', 'Admins']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('shows the phone sign-in switch with the MSG91 note, off as stored', () => {
    render(<Harness />);
    const phone = screen.getByLabelText('Sign in with phone number');
    expect(phone).toBe(screen.getByTestId('settings-sign-in-with-phone'));
    expect(phone).not.toBeChecked();
    expect(screen.getByText('Offers “Use phone number” on sign-in. Needs an MSG91 entry under Environment')).toBeInTheDocument();
  });

  it('writes the phone sign-in choice back to the form', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByLabelText('Sign in with phone number'));
    expect(screen.getByTestId('phone-value')).toHaveTextContent('true');
  });

  it('reflects the Duncit and reminder switches from the stored settings', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Allow sign in with a Duncit account')).toBeChecked();
    expect(screen.getByLabelText('Send reminder emails')).toBeChecked();
  });

  it('fills the URL, hours, UPI and admin boxes from the comma-joined form text', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Duncit GraphQL URL')).toHaveValue('https://api.example.com/graphql');
    expect(screen.getByLabelText('Duncit app URL')).toHaveValue('https://app.example.com');
    expect(screen.getByLabelText('Hours before start')).toHaveValue('24, 1');
    expect(screen.getByLabelText('UPI help text')).toHaveValue('Pay the host by UPI.');
    expect(screen.getByLabelText('Admin emails')).toHaveValue('owner@lite.example, ops@lite.example');
  });

  it('locks every switch and box while a save is running', () => {
    render(<Harness busy />);
    for (const testId of [
      'settings-sign-in-with-duncit',
      'settings-sign-in-with-phone',
      'settings-duncit-graphql-url',
      'settings-duncit-app-url',
      'settings-reminders-enabled',
      'settings-reminder-hours',
      'settings-upi-help-text',
      'settings-admin-emails',
    ]) {
      expect(screen.getByTestId(testId), testId).toBeDisabled();
    }
  });
});
