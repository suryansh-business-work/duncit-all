import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm, type SettingsFormValues } from '../../../../pages/settings/settings';
import { makeSettings } from '../../../fixtures';

const initial = makeSettings();

const setup = (onSubmit: (values: SettingsFormValues) => Promise<boolean> = vi.fn(() => Promise.resolve(true)), busy = false) => {
  const user = userEvent.setup();
  const view = render(<SettingsForm initial={initial} busy={busy} onSubmit={onSubmit} />);
  return { user, ...view };
};

describe('SettingsForm', () => {
  it('starts clean: Save and Cancel are off until something changes', () => {
    setup();
    expect(screen.getByTestId('settings-save')).toBeDisabled();
    expect(screen.getByTestId('settings-reset')).toBeDisabled();
  });

  it('submits the parsed values and settles back to clean when the server accepts them', async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true));
    const { user } = setup(onSubmit);
    const seats = screen.getByTestId('settings-max-seats');
    await user.clear(seats);
    await user.type(seats, '20');
    const currency = screen.getByTestId('settings-currency');
    await user.clear(currency);
    await user.type(currency, 'usd');
    await user.click(screen.getByLabelText('Sign in with phone number'));

    await user.click(screen.getByTestId('settings-save'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ max_seats_per_registration: '20', currency: 'USD', sign_in_with_phone: true }));
    await waitFor(() => expect(screen.getByTestId('settings-save')).toBeDisabled());
  });

  it('stays dirty when the server refuses the change', async () => {
    const onSubmit = vi.fn(() => Promise.resolve(false));
    const { user } = setup(onSubmit);
    await user.clear(screen.getByTestId('settings-site-name'));
    await user.type(screen.getByTestId('settings-site-name'), 'Lite Events');
    await user.click(screen.getByTestId('settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByTestId('settings-save')).toBeEnabled();
    expect(screen.getByTestId('settings-site-name')).toHaveValue('Lite Events');
  });

  it('shows the field message and does not submit an out-of-range limit', async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true));
    const { user } = setup(onSubmit);
    const capacity = screen.getByTestId('settings-max-event-capacity');
    await user.clear(capacity);
    await user.type(capacity, '0');
    await user.click(screen.getByTestId('settings-save'));
    expect(await screen.findByText('Largest event capacity must be 1 or more')).toBeInTheDocument();
    expect(capacity).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('will not save without a time zone and says so under the picker', async () => {
    const onSubmit = vi.fn(() => Promise.resolve(true));
    const { user } = setup(onSubmit);
    await user.click(screen.getByTestId('settings-timezone'));
    await user.click(screen.getByRole('button', { name: 'Clear', hidden: true }));
    await user.click(screen.getByTestId('settings-save'));
    expect(await screen.findByText('Pick a time zone from the list')).toBeInTheDocument();
    expect(screen.queryByText('Used for new events and every date shown')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates a box when it loses focus', async () => {
    const { user } = setup();
    const hours = screen.getByTestId('settings-reminder-hours');
    await user.clear(hours);
    await user.type(hours, '24, 1000');
    await user.tab();
    expect(await screen.findByText('Use whole hours separated by commas, for example 24, 1')).toBeInTheDocument();
  });

  it('Cancel puts back what the server holds', async () => {
    const { user } = setup();
    const name = screen.getByTestId('settings-site-name');
    await user.clear(name);
    await user.type(name, 'Something else');
    await user.click(screen.getByTestId('settings-reset'));
    expect(name).toHaveValue('Duncit Lite');
    expect(screen.getByTestId('settings-save')).toBeDisabled();
  });

  it("takes the server's copy whenever it changes", async () => {
    const { rerender } = setup();
    rerender(<SettingsForm initial={makeSettings({ site_name: 'Renamed elsewhere', max_seats_per_registration: 4 })} busy={false} onSubmit={vi.fn(() => Promise.resolve(true))} />);
    await waitFor(() => expect(screen.getByTestId('settings-site-name')).toHaveValue('Renamed elsewhere'));
    expect(screen.getByTestId('settings-max-seats')).toHaveValue('4');
  });

  it('reads Saving… and locks Cancel while busy', () => {
    setup(undefined, true);
    expect(screen.getByTestId('settings-save')).toHaveTextContent('Saving…');
    expect(screen.getByTestId('settings-reset')).toBeDisabled();
  });
});
