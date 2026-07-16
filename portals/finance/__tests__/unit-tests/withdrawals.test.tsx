import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useApolloClient, useMutation } from '@apollo/client';
import WithdrawalsPage from '../../src/pages/finance/withdrawals-page';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useMutation: vi.fn(), useApolloClient: vi.fn() };
});

const mockedUseMutation = vi.mocked(useMutation);
const mockedUseApolloClient = vi.mocked(useApolloClient);

const w1 = { id: 'w1', beneficiary_name: 'Host A', beneficiary_email: 'a@x', amount: 500, status: 'PENDING', payout_method: 'UPI', account_holder_name: 'A', account_number: '', ifsc_code: '', upi_id: 'a@upi', scheduled_for: '2024-01-01', reject_reason: '', requested_at: '2024-01-01' };
const w2 = { id: 'w2', beneficiary_name: 'Host B', beneficiary_email: 'b@x', amount: 300, status: 'REJECTED', payout_method: 'NEFT', account_holder_name: 'B', account_number: '123456', ifsc_code: 'IFSC1', upi_id: '', scheduled_for: 'bad-date', reject_reason: 'invalid account', requested_at: '2024-01-02' };
const w3 = { ...w1, id: 'w3', status: 'WEIRD', beneficiary_name: 'Host C', upi_id: 'c@upi' };

beforeEach(() => {
  mockedUseMutation.mockReset().mockReturnValue([vi.fn().mockResolvedValue({}), { loading: false }] as any);
  mockedUseApolloClient.mockReset().mockReturnValue({} as any);
  resetTableControls();
  (notifySuccess as any).mockClear();
  (notifyError as any).mockClear();
});

describe('WithdrawalsPage', () => {
  it('renders account/status variants and marks a withdrawal paid', async () => {
    tableControls.rows = [w1, w2, w3];
    renderUI(<WithdrawalsPage />);
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    expect(screen.getByText('a@upi')).toBeInTheDocument(); // UPI account
    expect(screen.getByText('123456 · IFSC1')).toBeInTheDocument(); // bank account
    expect(screen.getByText('invalid account')).toBeInTheDocument(); // reject reason

    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Marked as paid'));
  });

  it('rejects a withdrawal with a reason', async () => {
    tableControls.rows = [w1];
    renderUI(<WithdrawalsPage />);
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /reject & refund/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'fraud' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Withdrawal rejected'));
  });

  it('cancels the reject dialog', async () => {
    tableControls.rows = [w1];
    renderUI(<WithdrawalsPage />);
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surfaces a review error via a toast', async () => {
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('review failed')), { loading: false }] as any);
    tableControls.rows = [w1];
    renderUI(<WithdrawalsPage />);
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('review failed'));
  });

  it('disables the actions while a review is in flight', async () => {
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    tableControls.rows = [w1];
    renderUI(<WithdrawalsPage />);
    await waitFor(() => expect(screen.getByText('Host A')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /mark paid/i })).toBeDisabled();
  });
});
