/**
 * Finance > Withdrawal Payments, level 2: every request raised against ONE pod,
 * and the only place a withdrawal is accepted, partially approved, rejected or
 * has its payout retried.
 *
 * The Accept dialog is where the FULL payout target is shown (the list masks
 * account numbers) and where the three outcomes are chosen, so its wording,
 * its rules and the exact input it sends are asserted — not just that it opens.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import { PodWithdrawalDetailPage } from '../../src/pages/finance/withdrawals-page';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  decideWithdrawalMock,
  makeBankWithdrawalRow,
  makeFailedPayoutRow,
  makePaidWithdrawalRow,
  makePodWithdrawalGroup,
  makeWithdrawalRow,
  podWithdrawalSummaryErrorMock,
  podWithdrawalSummaryLoadingMock,
  podWithdrawalSummaryMock,
  retryWithdrawalPayoutMock,
  withdrawalReviewMock,
} from '../mocks/withdrawals.mock';

const upi = makeWithdrawalRow();
const paid = makePaidWithdrawalRow();
const rejected = makeWithdrawalRow({
  id: 'w3',
  withdrawal_id: 'WD-3',
  beneficiary_name: 'Club C',
  withdrawer_role: 'CLUB_ADMIN',
  status: 'REJECTED',
  approval_status: 'REJECTED',
  display_status: 'REJECTED',
  reject_reason: 'Account name does not match',
  decision_reason: 'Account name does not match',
  upi_id: 'c@upi',
});

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  notifyError.mockClear();
  tableControls.rowsByKey = { podWithdrawalsTable: [upi, paid, rejected] };
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

const openDialog = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
  return screen.findByRole('dialog', { name: 'Review withdrawal' });
};

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
    // The header chip comes first; the pending row's Decision cell also reads "Pending".
    expect(screen.getAllByText('Pending')[0]).toBeInTheDocument();
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
  it('shows each request with its decision and its payment kept apart', async () => {
    mount([podWithdrawalSummaryMock()]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(3));

    const upiRow = rowOf('Host A');
    expect(within(upiRow).getByTestId('cell-account_number')).toHaveTextContent('a@upi');
    expect(within(upiRow).getByTestId('cell-withdrawer_role')).toHaveTextContent('Host');
    expect(within(upiRow).getByTestId('cell-amount')).toHaveTextContent('₹500.00');
    expect(within(upiRow).queryByText(/from this pod/)).not.toBeInTheDocument();
    expect(within(upiRow).getByTestId('cell-approval_status')).toHaveTextContent('Pending');
    // Nothing has been sent, so there is no payment state at all.
    expect(within(upiRow).getByTestId('cell-payout_status')).toHaveTextContent('—');
    expect(within(upiRow).getByRole('button', { name: 'Accept' })).toBeEnabled();

    const paidRow = rowOf('Venue B');
    expect(within(paidRow).getByTestId('cell-account_number')).toHaveTextContent('••••9012 · HDFC0001234Blue Hall LLP');
    expect(within(paidRow).getByText('₹900.00 from this pod')).toBeInTheDocument();
    expect(within(paidRow).getByTestId('cell-approval_status')).toHaveTextContent('Approved');
    expect(within(paidRow).getByTestId('cell-payout_status')).toHaveTextContent('Paid');
    // Paid: nothing is left to do, so no action is offered.
    expect(within(paidRow).getByTestId('cell-actions')).toHaveTextContent('—');

    const rejectedRow = rowOf('Club C');
    expect(within(rejectedRow).getByText('Account name does not match')).toBeInTheDocument();
    expect(within(rejectedRow).getByTestId('cell-approval_status')).toHaveTextContent('Rejected');
  });

  it('names what was originally asked for after a partial approval lowered the amount', async () => {
    tableControls.rowsByKey = {
      podWithdrawalsTable: [
        makeWithdrawalRow({
          amount: 1200,
          requested_amount: 2000,
          approval_status: 'PARTIALLY_APPROVED',
          payout_status: 'PROCESSING',
          display_status: 'PROCESSING',
          razorpay_payout_id: 'pout_1',
        }),
      ],
    };
    mount([podWithdrawalSummaryMock()]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-amount')).toHaveTextContent('₹1,200.00');
    expect(within(row).getByText('Requested ₹2,000.00')).toBeInTheDocument();
    expect(within(row).getByTestId('cell-approval_status')).toHaveTextContent('Partially approved');
    expect(within(row).getByTestId('cell-payout_status')).toHaveTextContent('Processing');
    // A payout Razorpay already has can only be refreshed, never sent again.
    expect(within(row).getByRole('button', { name: 'Refresh status' })).toBeInTheDocument();
  });

  it('offers Retry payout and Reject for an approved withdrawal whose payout failed', async () => {
    tableControls.rowsByKey = { podWithdrawalsTable: [makeFailedPayoutRow()] };
    mount([podWithdrawalSummaryMock()]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByText('Beneficiary account closed')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Retry payout' })).toBeEnabled();
    expect(within(row).getByRole('button', { name: 'Reject withdrawal' })).toBeEnabled();
    expect(within(row).queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('retries a failed payout with the withdrawal id and says so', async () => {
    const sent: unknown[] = [];
    tableControls.rowsByKey = { podWithdrawalsTable: [makeFailedPayoutRow()] };
    mount([podWithdrawalSummaryMock(), retryWithdrawalPayoutMock({ sent })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry payout' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Payout restarted.'));
    expect(sent).toEqual([{ id: 'w4' }]);
  });

  it('surfaces a refused retry in a toast', async () => {
    tableControls.rowsByKey = { podWithdrawalsTable: [makeFailedPayoutRow()] };
    mount([podWithdrawalSummaryMock(), retryWithdrawalPayoutMock({ fail: true })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry payout' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('retry refused'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('PodWithdrawalDetailPage — the Accept dialog', () => {
  it('shows who is asking, how much, the wallet and the whole account to be paid', async () => {
    tableControls.rowsByKey = { podWithdrawalsTable: [makeBankWithdrawalRow()] };
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock({ withdrawal: makeBankWithdrawalRow({ id: 'w2' }) }, 'w2')]);
    const dialog = await openDialog();

    expect(await within(dialog).findByText('Venue B')).toBeInTheDocument();
    expect(within(dialog).getByText('Venue Owner')).toBeInTheDocument();
    expect(within(dialog).getByText('₹1,500.00')).toBeInTheDocument();
    expect(within(dialog).getByText('₹3,000.00')).toBeInTheDocument();
    expect(within(dialog).getByText('Blue Hall LLP · 123456789012 · HDFC0001234')).toBeInTheDocument();
    expect(within(dialog).getByText('Verified account')).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Accept withdrawal' })).toBeChecked();
  });

  it('accepts in full, sending exactly the approval and nothing else', async () => {
    const sent: unknown[] = [];
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock(), decideWithdrawalMock({ sent })]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Accept & pay' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Withdrawal accepted. The payment is being sent.'));
    expect(sent).toEqual([
      { id: 'w1', input: { decision: 'APPROVE', approved_amount: null, reason: null, acknowledge_unverified_account: false } },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('partially approves only with an amount below the request and a reason', async () => {
    const sent: unknown[] = [];
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock(), decideWithdrawalMock({ sent })]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('radio', { name: 'Partially approve' }));
    const submit = () => fireEvent.click(within(dialog).getByRole('button', { name: 'Approve part & pay' }));

    submit();
    expect(await within(dialog).findByText('Enter the amount to approve (at least 1).')).toBeInTheDocument();
    expect(within(dialog).getByText('Give a reason of at least 3 characters.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/^Approved amount/), { target: { value: '500' } });
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'Part is on hold' } });
    submit();
    expect(
      await within(dialog).findByText(/A partial approval must be less than the requested amount/),
    ).toBeInTheDocument();
    expect(sent).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText(/^Approved amount/), { target: { value: '300.50' } });
    submit();
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Withdrawal partially approved. The rest went back to the wallet.'),
    );
    expect(sent).toEqual([
      { id: 'w1', input: { decision: 'PARTIAL', approved_amount: 300.5, reason: 'Part is on hold', acknowledge_unverified_account: false } },
    ]);
  });

  it('refuses more than two decimals and amounts under 1 for a partial approval', async () => {
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock(), decideWithdrawalMock()]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('radio', { name: 'Partially approve' }));
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'Part is on hold' } });

    fireEvent.change(within(dialog).getByLabelText(/^Approved amount/), { target: { value: '100.123' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve part & pay' }));
    expect(await within(dialog).findByText('Use at most two decimal places.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/^Approved amount/), { target: { value: '0.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve part & pay' }));
    expect(await within(dialog).findByText('Enter the amount to approve (at least 1).')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('asks for a reason before rejecting, then sends the rejection', async () => {
    const sent: unknown[] = [];
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock(), decideWithdrawalMock({ sent })]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('radio', { name: 'Reject withdrawal' }));
    expect(within(dialog).getByText('Shown to the withdrawer.')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject & refund' }));
    expect(await within(dialog).findByText('Give a reason of at least 3 characters.')).toBeInTheDocument();
    expect(sent).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'Account is frozen' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject & refund' }));
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Withdrawal rejected. The amount went back to the wallet.'),
    );
    expect(sent).toEqual([
      { id: 'w1', input: { decision: 'REJECT', approved_amount: null, reason: 'Account is frozen', acknowledge_unverified_account: false } },
    ]);
  });

  it('will not approve an account that is not on a verified record until it is acknowledged', async () => {
    const sent: unknown[] = [];
    mount([
      podWithdrawalSummaryMock(),
      withdrawalReviewMock({ account_verified: false, verified_account: null }),
      decideWithdrawalMock({ sent }),
    ]);
    const dialog = await openDialog();
    expect(await within(dialog).findByText('Not on a verified record')).toBeInTheDocument();
    expect(within(dialog).getByText(/is not on a verified Duncit record/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept & pay' }));
    expect(await within(dialog).findByText('Confirm you have checked the account to continue.')).toBeInTheDocument();
    expect(sent).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole('checkbox', { name: /checked this account/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept & pay' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent).toEqual([
      { id: 'w1', input: { decision: 'APPROVE', approved_amount: null, reason: null, acknowledge_unverified_account: true } },
    ]);
  });

  it('needs no acknowledgement to reject an unverified account', async () => {
    const sent: unknown[] = [];
    mount([
      podWithdrawalSummaryMock(),
      withdrawalReviewMock({ account_verified: false, verified_account: null }),
      decideWithdrawalMock({ sent }),
    ]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('radio', { name: 'Reject withdrawal' }));
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'Not our partner' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject & refund' }));
    await waitFor(() => expect(sent).toHaveLength(1));
  });

  it('cannot approve at all while payouts are not set up, but can still reject', async () => {
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock({ payouts_configured: false }), decideWithdrawalMock()]);
    const dialog = await openDialog();
    expect(await within(dialog).findByText(/Payouts are not set up/)).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Accept withdrawal' })).toBeDisabled();
    expect(within(dialog).getByRole('radio', { name: 'Partially approve' })).toBeDisabled();
    expect(within(dialog).getByRole('radio', { name: 'Reject withdrawal' })).toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Reject & refund' })).toBeEnabled();
  });

  it('offers only a rejection for an approved withdrawal whose payout failed', async () => {
    tableControls.rowsByKey = { podWithdrawalsTable: [makeFailedPayoutRow()] };
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock({ withdrawal: makeFailedPayoutRow() }, 'w4')]);
    fireEvent.click(await screen.findByRole('button', { name: 'Reject withdrawal' }));
    const dialog = await screen.findByRole('dialog', { name: 'Review withdrawal' });
    await waitFor(() => expect(within(dialog).getByRole('radio', { name: 'Reject withdrawal' })).toBeChecked());
    expect(within(dialog).getByRole('radio', { name: 'Accept withdrawal' })).toBeDisabled();
    expect(within(dialog).getByRole('radio', { name: 'Partially approve' })).toBeDisabled();
  });

  it('surfaces a refused decision in a toast and keeps the dialog open', async () => {
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock(), decideWithdrawalMock({ fail: true })]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Accept & pay' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('decision refused'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Review withdrawal' })).toBeInTheDocument();
  });

  it('cancels via the button and via Escape, starting fresh each time', async () => {
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock(), decideWithdrawalMock()]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('radio', { name: 'Reject withdrawal' }));
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'half typed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    const again = await screen.findByRole('dialog', { name: 'Review withdrawal' });
    expect(await within(again).findByRole('radio', { name: 'Accept withdrawal' })).toBeChecked();
    fireEvent.keyDown(again, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('never decides the same request twice when the button is double-clicked', async () => {
    const sent: unknown[] = [];
    mount([podWithdrawalSummaryMock(), withdrawalReviewMock(), decideWithdrawalMock({ sent })]);
    const dialog = await openDialog();
    const confirm = await within(dialog).findByRole('button', { name: 'Accept & pay' });

    // Both clicks land in one batch, before the first one's loading state can render.
    act(() => {
      confirm.click();
      confirm.click();
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toHaveLength(1);
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });
});

describe('PodWithdrawalDetailPage — the header re-read after a decision', () => {
  it('does not report a saved decision as failed when the header re-read fails', async () => {
    mount([
      { ...podWithdrawalSummaryMock(), maxUsageCount: 1 },
      podWithdrawalSummaryErrorMock(),
      withdrawalReviewMock(),
      decideWithdrawalMock(),
    ]);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Accept & pay' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    // The re-read's failure lands on the page guard, never as a decision error toast.
    expect(await screen.findByTestId('qg-error')).toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();
  });
});
