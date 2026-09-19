/**
 * Finance > Withdrawal Payments, level 2: every request raised against ONE pod,
 * and the only place a withdrawal is marked paid or rejected.
 *
 * Mark Paid is where the FULL payout target is shown (the list masks account
 * numbers), so the confirmation's wording is asserted, not just that it opens.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import { PodWithdrawalDetailPage } from '../../src/pages/finance/withdrawals-page';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  makeBankWithdrawalRow,
  makePodWithdrawalGroup,
  makeWithdrawalRow,
  podWithdrawalSummaryErrorMock,
  podWithdrawalSummaryLoadingMock,
  podWithdrawalSummaryMock,
  reviewWithdrawalMock,
} from '../mocks/withdrawals.mock';

const upi = makeWithdrawalRow();
const bank = makeBankWithdrawalRow({ status: 'PAID' });
const rejected = makeWithdrawalRow({
  id: 'w3',
  withdrawal_id: 'WD-3',
  beneficiary_name: 'Club C',
  withdrawer_role: 'CLUB_ADMIN',
  status: 'REJECTED',
  reject_reason: 'Account name does not match',
  upi_id: 'c@upi',
});

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  notifyError.mockClear();
  tableControls.rowsByKey = { podWithdrawalsTable: [upi, bank, rejected] };
});

const mount = (mocks: MockedResponse[]) =>
  renderWithProviders(<PodWithdrawalDetailPage />, {
    path: '/withdrawals/:podId',
    entry: '/withdrawals/DUN-POD-4821',
    mocks,
    extra: <Route path="/withdrawals" element={<div data-testid="list-probe">list</div>} />,
  });

const rowOf = (name: string) =>
  screen.getAllByTestId('table-row').find((row) => within(row).queryByText(name)) as HTMLElement;

describe('PodWithdrawalDetailPage — the pod header', () => {
  it('shows the guard while the pod loads, and on a failed read', async () => {
    const { unmount } = mount([podWithdrawalSummaryLoadingMock()]);
    expect(screen.getByTestId('qg-loading')).toBeInTheDocument();
    unmount();

    mount([podWithdrawalSummaryErrorMock()]);
    expect(await screen.findByTestId('qg-error')).toBeInTheDocument();
  });

  it('renders nothing for a pod nobody has withdrawn against', async () => {
    mount([podWithdrawalSummaryMock(null)]);
    await waitFor(() => expect(screen.queryByTestId('qg-loading')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('names the pod, who asked, and that it is still pending — then goes back', async () => {
    mount([podWithdrawalSummaryMock()]);
    expect(await screen.findByRole('heading', { name: 'Sunday Badminton' })).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(
      screen.getByText('Every withdrawal request raised against this pod. · Host, Venue Owner'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Withdrawal Payments' }));
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
  });

  it('reads a pod as approved once every request is paid', async () => {
    mount([podWithdrawalSummaryMock(makePodWithdrawalGroup({ status: 'APPROVED', requested_from: [] }))]);
    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Every withdrawal request raised against this pod.')).toBeInTheDocument();
  });
});

describe('PodWithdrawalDetailPage — the requests', () => {
  it('shows each request with a masked account, this pod’s slice and its review state', async () => {
    mount([podWithdrawalSummaryMock()]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(3));

    const upiRow = rowOf('Host A');
    expect(within(upiRow).getByTestId('cell-account_number')).toHaveTextContent('a@upi');
    expect(within(upiRow).getByTestId('cell-withdrawer_role')).toHaveTextContent('Host');
    // The whole request was this pod's money, so no slice is called out.
    expect(within(upiRow).getByTestId('cell-amount')).toHaveTextContent('₹500.00');
    expect(within(upiRow).queryByText(/from this pod/)).not.toBeInTheDocument();
    expect(within(upiRow).getByRole('button', { name: 'Mark Paid' })).toBeEnabled();

    const bankRow = rowOf('Venue B');
    expect(within(bankRow).getByTestId('cell-account_number')).toHaveTextContent(
      '••••9012 · HDFC0001234Blue Hall LLP',
    );
    expect(within(bankRow).getByText('₹900.00 from this pod')).toBeInTheDocument();
    expect(within(bankRow).getByTestId('cell-status')).toHaveTextContent('PAID');
    expect(within(bankRow).getByTestId('cell-actions')).toHaveTextContent('—');

    const rejectedRow = rowOf('Club C');
    expect(within(rejectedRow).getByText('Account name does not match')).toBeInTheDocument();
    expect(within(rejectedRow).getByTestId('cell-withdrawer_role')).toHaveTextContent('Club Admin');
  });

  it('confirms the full UPI target before marking a request paid', async () => {
    mount([podWithdrawalSummaryMock(), reviewWithdrawalMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Paid' }));

    const dialog = await screen.findByRole('dialog', { name: 'Mark withdrawal as paid' });
    expect(within(dialog).getByText('Release ₹500.00 to Host A (Host).')).toBeInTheDocument();
    expect(within(dialog).getByText('Pay to: a@upi')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark Paid' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Marked as paid'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a bank transfer’s whole account in the confirmation, and can back out', async () => {
    tableControls.rowsByKey = { podWithdrawalsTable: [makeBankWithdrawalRow()] };
    mount([podWithdrawalSummaryMock(), reviewWithdrawalMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Paid' }));

    const dialog = await screen.findByRole('dialog', { name: 'Mark withdrawal as paid' });
    expect(within(dialog).getByText('Release ₹1,500.00 to Venue B (Venue Owner).')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Pay to: Blue Hall LLP · 123456789012 · HDFC0001234'),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('asks for a reason before rejecting, then credits the request back', async () => {
    mount([podWithdrawalSummaryMock(), reviewWithdrawalMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));

    const dialog = await screen.findByRole('dialog', { name: 'Reject withdrawal' });
    expect(within(dialog).getByText(/Rejecting credits Host A's wallet back/)).toBeInTheDocument();
    expect(within(dialog).getByText('Shown to the withdrawer.')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /reject & refund/i }));
    expect(
      await within(dialog).findByText('Give the withdrawer at least a short reason (5 characters).'),
    ).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'Account is frozen' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /reject & refund/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Withdrawal rejected'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancels the reject dialog via the button and via Escape, starting blank each time', async () => {
    mount([podWithdrawalSummaryMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject withdrawal' });
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'half typed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const again = await screen.findByRole('dialog', { name: 'Reject withdrawal' });
    expect(within(again).getByLabelText(/^Reason/)).toHaveValue('');
    fireEvent.keyDown(again, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surfaces a refused review in a toast and keeps the dialog open', async () => {
    mount([podWithdrawalSummaryMock(), reviewWithdrawalMock({ fail: true })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Paid' }));
    const dialog = await screen.findByRole('dialog', { name: 'Mark withdrawal as paid' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark Paid' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('review failed'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Mark withdrawal as paid' })).toBeInTheDocument();
  });

  it('disables every review action while one is in flight', async () => {
    mount([podWithdrawalSummaryMock(), reviewWithdrawalMock({ delay: 60_000 })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Paid' }));
    const dialog = await screen.findByRole('dialog', { name: 'Mark withdrawal as paid' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark Paid' }));
    await waitFor(() =>
      expect(within(rowOf('Host A')).getByRole('button', { name: 'Reject', hidden: true })).toBeDisabled(),
    );
  });
});
