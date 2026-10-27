/**
 * Finance > Rented Items > Settings — the rules every venue rental runs under.
 * The rich-text editor is a contenteditable toolbar jsdom cannot drive, so a
 * textarea with the same value/onChange contract stands in for it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import RentedItemsSettingsPage from '../../src/pages/finance/rented-items-settings-page';
import RentalSettingsForm from '../../src/pages/finance/rented-items-settings-page/rental-settings-form';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  makeRentalSettings,
  rentalSettingsErrorMock,
  rentalSettingsMock,
  updateRentalSettingsMock,
} from '../mocks/rental-settings.mock';

vi.mock('@duncit/rich-text', () => ({
  DuncitRichTextInput: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (html: string) => void;
    ariaLabel?: string;
  }) => <textarea aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />,
}));

beforeEach(() => {
  notifySuccess.mockClear();
});

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;
const saveButton = () => screen.getByTestId('rental-settings-save');

const stored = makeRentalSettings();
/** What the page sends back: the stored rules without the server's own stamp. */
const { __typename: _typename, updated_at: _updatedAt, ...storedInput } = stored;

describe('RentedItemsSettingsPage', () => {
  it('shows a labelled spinner until the rules arrive, then opens the form on them', async () => {
    renderWithProviders(<RentedItemsSettingsPage />, { mocks: [rentalSettingsMock()] });

    expect(screen.getByRole('status', { name: 'Loading the rental settings' })).toBeInTheDocument();
    expect(await screen.findByTestId('rental-settings-form')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rental Settings' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Rentals are on' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Refund rent when a guest leaves the pod' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Deposits are refundable' })).not.toBeChecked();
    expect(field(/^Duncit commission on rent/).value).toBe('10');
    expect(field(/^Renting closes/).value).toBe('24');
    expect(field(/^Auto-release deposits/).value).toBe('7');
    expect(screen.getByRole('textbox', { name: 'Terms & Conditions' })).toHaveValue('<p>Return items clean.</p>');
    // Nothing edited yet, so there is nothing to save.
    expect(saveButton()).toBeDisabled();
  });

  it('sends exactly what was edited, as numbers, then says it was saved', async () => {
    const saved = { ...storedInput, commission_pct: 12.5, booking_cutoff_hours: 48 };
    renderWithProviders(<RentedItemsSettingsPage />, {
      mocks: [
        rentalSettingsMock(),
        updateRentalSettingsMock(saved),
        // The write refetches the rules, which now answer with what was saved.
        rentalSettingsMock(makeRentalSettings(saved)),
      ],
    });
    await screen.findByTestId('rental-settings-form');

    fireEvent.change(field(/^Duncit commission on rent/), { target: { value: '12.5' } });
    fireEvent.change(field(/^Renting closes/), { target: { value: '48' } });
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Rental settings saved'));
    expect(screen.queryByTestId('rental-settings-error')).not.toBeInTheDocument();
    await waitFor(() => expect(field(/^Duncit commission on rent/).value).toBe('12.5'));
    // The form re-opens on what was stored, clean.
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it('keeps the form open and names the refusal when the server refuses the save', async () => {
    const attempted = { ...storedInput, enabled: false };
    renderWithProviders(<RentedItemsSettingsPage />, {
      mocks: [rentalSettingsMock(), updateRentalSettingsMock(attempted, { fail: 'Commission is locked' })],
    });
    await screen.findByTestId('rental-settings-form');

    fireEvent.click(screen.getByRole('switch', { name: 'Rentals are on' }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    expect(await screen.findByTestId('rental-settings-error')).toHaveTextContent('Commission is locked');
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Rentals are on' })).not.toBeChecked();
  });

  it('says why the rules could not be loaded and loads them on Retry', async () => {
    renderWithProviders(<RentedItemsSettingsPage />, {
      mocks: [rentalSettingsErrorMock('Settings service is down'), rentalSettingsMock()],
    });

    const alert = await screen.findByTestId('rental-settings-load-error');
    expect(alert).toHaveTextContent('Settings service is down');
    expect(screen.queryByTestId('rental-settings-form')).not.toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('rental-settings-form')).toBeInTheDocument();
    expect(screen.queryByTestId('rental-settings-load-error')).not.toBeInTheDocument();
  });

  it('keeps the alert up with the new reason when a Retry fails too', async () => {
    renderWithProviders(<RentedItemsSettingsPage />, {
      mocks: [rentalSettingsErrorMock('Settings service is down'), rentalSettingsErrorMock('Still down')],
    });

    const alert = await screen.findByTestId('rental-settings-load-error');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    await waitFor(() =>
      expect(screen.getByTestId('rental-settings-load-error')).toHaveTextContent('Still down'),
    );
    expect(screen.queryByTestId('rental-settings-form')).not.toBeInTheDocument();
  });
});

describe('RentalSettingsForm', () => {
  const values = {
    enabled: true,
    terms_html: '',
    commission_pct: 10,
    rent_refundable_on_backout: true,
    deposit_refundable: true,
    booking_cutoff_hours: 24,
    deposit_auto_release_days: 7,
  };

  it('refuses a commission above 100 with its range, and sends nothing', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<RentalSettingsForm values={values} busy={false} onSubmit={onSubmit} />);

    fireEvent.change(field(/^Duncit commission on rent/), { target: { value: '101' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Enter a percent from 0 to 100')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses fractional hours and a zero auto-release, naming each range', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<RentalSettingsForm values={values} busy={false} onSubmit={onSubmit} />);

    fireEvent.change(field(/^Renting closes/), { target: { value: '1.5' } });
    fireEvent.change(field(/^Auto-release deposits/), { target: { value: '0' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Enter whole hours from 0 to 168')).toBeInTheDocument();
    expect(screen.getByText('Enter whole days from 1 to 60')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses terms over 50,000 characters', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<RentalSettingsForm values={values} busy={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Terms & Conditions' }), { target: { value: 'x'.repeat(50_001) } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Keep the terms under 50,000 characters')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands over the edited terms and switches, and shows the hint for each rule', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<RentalSettingsForm values={values} busy={false} onSubmit={onSubmit} />);

    expect(screen.getByText('Every guest agrees to these before renting.')).toBeInTheDocument();
    expect(screen.getByText('Taken from the rent only, never from a deposit.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Terms & Conditions' }), { target: { value: '<p>New terms</p>' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Deposits are refundable' }));
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      enabled: true,
      terms_html: '<p>New terms</p>',
      commission_pct: 10,
      rent_refundable_on_backout: true,
      deposit_refundable: false,
      booking_cutoff_hours: 24,
      deposit_auto_release_days: 7,
    });
  });

  it('shows Saving… and locks the button while a save is in flight', () => {
    renderWithProviders(<RentalSettingsForm values={values} busy onSubmit={vi.fn()} />);

    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent('Saving…');
  });

  it('describes each switch by its hint', () => {
    renderWithProviders(<RentalSettingsForm values={values} busy={false} onSubmit={vi.fn()} />);

    const rentRefund = screen.getByRole('switch', { name: 'Refund rent when a guest leaves the pod' });
    const hint = document.getElementById(rentRefund.getAttribute('aria-describedby') ?? '');
    expect(hint).toHaveTextContent(
      'When a guest’s backout spot is filled. A cancelled pod always refunds rent and deposits.',
    );
  });
});
