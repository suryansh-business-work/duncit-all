import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import WithdrawalsPage from '../../src/pages/finance/withdrawals-page';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import { makeWithdrawalRow, reviewWithdrawalMock } from '../mocks/withdrawals.mock';

const w1 = makeWithdrawalRow();
const w2 = makeWithdrawalRow({
  id: 'w2',
  beneficiary_name: 'Host B',
  beneficiary_email: 'b@x',
  amount: 300,
  status: 'REJECTED',
  payout_method: 'NEFT',
  account_holder_name: 'B',
  account_number: '123456',
  ifsc_code: 'IFSC1',
  upi_id: '',
  scheduled_for: 'bad-date',
  reject_reason: 'invalid account',
  requested_at: '2024-01-02',
});
const w3 = makeWithdrawalRow({ id: 'w3', status: 'WEIRD', beneficiary_name: 'Host C', upi_id: 'c@upi' });

beforeEach(() => {
  resetTableControls();
  (notifySuccess as unknown as { mockClear: () => void }).mockClear();
  (notifyError as unknown as { mockClear: () => void }).mockClear();
});

describe('WithdrawalsPage', () => {
  it('renders account/status variants and marks a withdrawal paid', async () => {
    tableControls.rows = [w1, w2, w3];
    renderWithProviders(<WithdrawalsPage />, { mocks: [reviewWithdrawalMock()] });
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    expect(screen.getByText('a@upi')).toBeInTheDocument();
    expect(screen.getByText('123456 · IFSC1')).toBeInTheDocument();
    expect(screen.getByText('invalid account')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Marked as paid'));
  });

  it('rejects a withdrawal with a reason', async () => {
    tableControls.rows = [w1];
    renderWithProviders(<WithdrawalsPage />, { mocks: [reviewWithdrawalMock()] });
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /reject & refund/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'fraud' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Withdrawal rejected'));
  });

  it('cancels the reject dialog via the button and via Escape', async () => {
    tableControls.rows = [w1];
    renderWithProviders(<WithdrawalsPage />, { mocks: [reviewWithdrawalMock()] });
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog2 = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog2, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surfaces a review error via a toast', async () => {
    tableControls.rows = [w1];
    renderWithProviders(<WithdrawalsPage />, { mocks: [reviewWithdrawalMock({ fail: true })] });
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('review failed'));
  });

  it('disables the actions while a review is in flight', async () => {
    tableControls.rows = [w1];
    renderWithProviders(<WithdrawalsPage />, { mocks: [reviewWithdrawalMock({ delay: 60_000 })] });
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /mark paid/i })).toBeDisabled());
  });
});
