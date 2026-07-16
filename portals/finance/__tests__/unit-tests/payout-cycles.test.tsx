import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import PayoutCyclesPage from '../../src/pages/finance/payout-cycles-page';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  makePayoutSettings,
  payoutSettingsLoadingMock,
  payoutSettingsMock,
  updatePayoutSettingsMock,
} from '../mocks/payout-cycles.mock';

const selectOption = (name: RegExp | string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  const listbox = screen.getByRole('listbox');
  fireEvent.click(within(listbox).getByText(option));
};

beforeEach(() => {
  (notifySuccess as unknown as { mockClear: () => void }).mockClear();
});

describe('PayoutCyclesPage', () => {
  it('shows a spinner while loading', () => {
    renderWithProviders(<PayoutCyclesPage />, { mocks: [payoutSettingsLoadingMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders a weekly schedule and saves', async () => {
    renderWithProviders(<PayoutCyclesPage />, {
      mocks: [payoutSettingsMock(), updatePayoutSettingsMock()],
    });
    await screen.findByText('Payout Cycles');
    expect(screen.getByRole('combobox', { name: /payout day/i })).toBeInTheDocument();
    selectOption(/payout day/i, 'Wednesday');

    fireEvent.click(screen.getByRole('button', { name: /save cycle/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Payout cycle saved'));
  });

  it('hides the weekly controls when both modes are immediate', async () => {
    renderWithProviders(<PayoutCyclesPage />, {
      mocks: [
        payoutSettingsMock(
          makePayoutSettings({ venue_payout_mode: 'IMMEDIATE', host_payout_mode: 'IMMEDIATE', payout_time: '' }),
        ),
      ],
    });
    await screen.findByText('Payout Cycles');
    expect(screen.queryByRole('combobox', { name: /payout day/i })).not.toBeInTheDocument();
  });

  it('switches to a MONTH_END schedule (scheduled, not weekly)', async () => {
    renderWithProviders(<PayoutCyclesPage />, {
      mocks: [
        payoutSettingsMock(
          makePayoutSettings({ venue_payout_mode: 'IMMEDIATE', host_payout_mode: 'IMMEDIATE', payout_time: '00:15' }),
        ),
        updatePayoutSettingsMock(),
      ],
    });
    await screen.findByText('Payout Cycles');
    selectOption('Venue payout', 'Month end');
    expect(screen.queryByRole('combobox', { name: /payout day/i })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Host payout' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Weekly'));
    fireEvent.change(screen.getByLabelText('Payout time'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save cycle/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Payout cycle saved'));
  });

  it('renders without settings (effect no-op)', async () => {
    renderWithProviders(<PayoutCyclesPage />, { mocks: [payoutSettingsMock(null)] });
    expect(await screen.findByText('Payout Cycles')).toBeInTheDocument();
  });

  it('surfaces a save error', async () => {
    renderWithProviders(<PayoutCyclesPage />, {
      mocks: [payoutSettingsMock(), updatePayoutSettingsMock({ fail: true })],
    });
    await screen.findByText('Payout Cycles');
    fireEvent.click(screen.getByRole('button', { name: /save cycle/i }));
    expect(await screen.findByText('save failed')).toBeInTheDocument();
  });

  it('shows the saving state (disabled button)', async () => {
    renderWithProviders(<PayoutCyclesPage />, {
      mocks: [payoutSettingsMock(), updatePayoutSettingsMock({ delay: 60_000 })],
    });
    await screen.findByText('Payout Cycles');
    fireEvent.click(screen.getByRole('button', { name: /save cycle/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled());
  });
});
