import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { DateTimeSection } from '../../../../pages/settings/settings/DateTimeSection';
import { settingsValuesFrom, type SettingsFormValues } from '../../../../pages/settings/settings';
import { makeSettings } from '../../../fixtures';

function Harness({ busy = false, zone = 'America/New_York' }: Readonly<{ busy?: boolean; zone?: string }>) {
  const { control, watch } = useForm<SettingsFormValues>({ defaultValues: settingsValuesFrom(makeSettings({ default_timezone: zone })) });
  return (
    <>
      <DateTimeSection control={control} busy={busy} />
      <output data-testid="zone-value">{watch('default_timezone')}</output>
    </>
  );
}

describe('DateTimeSection', () => {
  it('shows the stored zone and both date-fns patterns with their hints', () => {
    render(<Harness />);
    expect(screen.getByText('Date and time')).toBeInTheDocument();
    expect(screen.getByTestId('settings-timezone')).toHaveValue('America/New_York');
    expect(screen.getByText('Used for new events and every date shown')).toBeInTheDocument();
    expect(screen.getByLabelText(/Date format/)).toHaveValue('dd MMM yyyy');
    expect(screen.getByLabelText(/Time format/)).toHaveValue('hh:mm a');
  });

  it('lets the admin pick another zone from the list', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByTestId('settings-timezone');
    await user.clear(box);
    await user.type(box, 'Europe/Lond');
    await user.click(await screen.findByRole('option', { name: 'Europe/London' }));
    expect(screen.getByTestId('zone-value')).toHaveTextContent('Europe/London');
  });

  it('empties the zone when the admin clears the picker', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByTestId('settings-timezone'));
    // MUI only paints the clear icon on hover/focus; it is always in the DOM.
    await user.click(screen.getByRole('button', { name: 'Clear', hidden: true }));
    expect(screen.getByTestId('zone-value')).toBeEmptyDOMElement();
  });

  it('shows an empty picker when nothing is stored', () => {
    render(<Harness zone="" />);
    expect(screen.getByTestId('settings-timezone')).toHaveValue('');
  });

  it('locks the picker and patterns while a save is running', () => {
    render(<Harness busy />);
    expect(screen.getByTestId('settings-timezone')).toBeDisabled();
    expect(screen.getByTestId('settings-date-format')).toBeDisabled();
    expect(screen.getByTestId('settings-time-format')).toBeDisabled();
  });
});
