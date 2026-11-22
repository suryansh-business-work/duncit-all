/**
 * Withdrawal Logs and Send Money Logs: the read-only records of money going out.
 * What matters here is that every column Finance audits with is actually shown
 * with the right value, and that the only action a log offers is the one that
 * can still help (retry a failed or stalled transfer).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { WithdrawalLogsPage } from '../../src/pages/finance/withdrawals-page';
import { SendMoneyLogsPage } from '../../src/pages/finance/send-money-page';
import { RETRY_SEND_MONEY_TRANSFER, type TransferRow } from '../../src/pages/finance/send-money-page/queries';
import type { PayoutAuditRow } from '../../src/pages/finance/withdrawals-page/queries';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';

const audit = (over: Partial<PayoutAuditRow> = {}): PayoutAuditRow => ({
  id: 'e1',
  subject_id: 'wd_abc',
  action: 'PARTIALLY_APPROVED',
  user_name: 'Meera Nair',
  requested_amount: 2000,
  approved_amount: 1200,
  reason: 'Part is on hold',
  actor_name: 'Finance One',
  actor_role: 'FINANCE_MANAGER',
  payment_status: 'PROCESSING',
  razorpay_payout_id: 'pout_1',
  utr: '',
  created_at: '2026-11-20T10:00:00.000Z',
  ...over,
});

const transfer = (over: Partial<TransferRow> = {}): TransferRow => ({
  id: 't1',
  transfer_id: 'sm_abc',
  recipient_name: 'Meera Nair',
  recipient_email: 'meera@example.com',
  amount: 15000,
  category: 'SALARY',
  reason: 'October salary',
  notes: 'includes bonus',
  supporting_reference: 'INV-9',
  payout_method: 'IMPS',
  initiated_by_name: 'Finance One',
  approved_by_name: 'Finance One',
  status: 'PAID',
  razorpay_payout_id: 'pout_9',
  utr: 'UTR9',
  failure_reason: '',
  created_at: '2026-11-20T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('Withdrawal Logs', () => {
  it('shows who acted, the requested and approved amounts, the reason and the payment state', async () => {
    tableControls.rowsByKey = {
      payoutAuditTable: [
        audit(),
        audit({ id: 'e2', action: 'REJECTED', approved_amount: null, reason: 'Bank details unclear', payment_status: 'REJECTED', razorpay_payout_id: '' }),
        audit({ id: 'e3', action: 'PAYOUT_PAID', payment_status: 'PAID', utr: 'UTR77', actor_name: 'Razorpay', actor_role: 'SYSTEM' }),
      ],
    };
    renderWithProviders(<WithdrawalLogsPage />, { path: '/withdrawals/logs', entry: '/withdrawals/logs', mocks: [] });
    expect(await screen.findByRole('heading', { name: 'Withdrawal Logs' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(3));
    const [partial, rejected, paid] = screen.getAllByTestId('table-row');

    expect(within(partial).getByTestId('cell-user_name')).toHaveTextContent('Meera Nair');
    expect(within(partial).getByTestId('cell-requested_amount')).toHaveTextContent('₹2,000.00');
    expect(within(partial).getByTestId('cell-approved_amount')).toHaveTextContent('₹1,200.00');
    expect(within(partial).getByTestId('cell-action')).toHaveTextContent('Partially approved');
    expect(within(partial).getByTestId('cell-reason')).toHaveTextContent('Part is on hold');
    expect(within(partial).getByTestId('cell-actor_name')).toHaveTextContent('Finance One (FINANCE_MANAGER)');
    expect(within(partial).getByTestId('cell-payment_status')).toHaveTextContent('Processing');
    expect(within(partial).getByTestId('cell-razorpay_payout_id')).toHaveTextContent('pout_1');

    // A rejection approved nothing and has no payout: those cells read as empty, not as zero.
    expect(within(rejected).getByTestId('cell-approved_amount')).toHaveTextContent('—');
    expect(within(rejected).getByTestId('cell-razorpay_payout_id')).toHaveTextContent('—');
    expect(within(rejected).getByTestId('cell-payment_status')).toHaveTextContent('Rejected');

    expect(within(paid).getByTestId('cell-utr')).toHaveTextContent('UTR77');
    expect(within(paid).getByTestId('cell-actor_name')).toHaveTextContent('Razorpay (SYSTEM)');
  });

  it('reads missing details as a dash, and an unrecognised action as itself', async () => {
    tableControls.rowsByKey = {
      payoutAuditTable: [
        audit({ user_name: '', reason: '', actor_role: '', payment_status: '', action: 'FUTURE_ACTION', razorpay_payout_id: '' }),
        audit({ id: 'e9', actor_name: '', actor_role: '' }),
      ],
    };
    renderWithProviders(<WithdrawalLogsPage />, { path: '/withdrawals/logs', entry: '/withdrawals/logs', mocks: [] });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    const [row, nobody] = screen.getAllByTestId('table-row');
    // An action with nobody behind it (no name, no role) reads as a dash too.
    expect(within(nobody).getByTestId('cell-actor_name')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-user_name')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-reason')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-actor_name')).toHaveTextContent('Finance One');
    expect(within(row).getByTestId('cell-actor_name')).not.toHaveTextContent('(');
    expect(within(row).getByTestId('cell-payment_status')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-action')).toHaveTextContent('FUTURE_ACTION');
  });

  it('offers no action on any row: the trail is read-only', async () => {
    tableControls.rowsByKey = { payoutAuditTable: [audit()] };
    renderWithProviders(<WithdrawalLogsPage />, { path: '/withdrawals/logs', entry: '/withdrawals/logs', mocks: [] });
    await screen.findAllByTestId('table-row');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says so when nothing has been recorded', async () => {
    renderWithProviders(<WithdrawalLogsPage />, { path: '/withdrawals/logs', entry: '/withdrawals/logs', mocks: [] });
    expect(await screen.findByText('No withdrawal activity has been recorded yet.')).toBeInTheDocument();
  });
});

describe('Send Money Logs', () => {
  const mount = (mocks: MockedResponse[] = []) =>
    renderWithProviders(<SendMoneyLogsPage />, { path: '/send-money/logs', entry: '/send-money/logs', mocks });

  it('shows the recipient, amount, category, reason, who sent and approved it, and the bank reference', async () => {
    tableControls.rowsByKey = { sendMoneyTransfersTable: [transfer()] };
    mount();
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-recipient_name')).toHaveTextContent('Meera Nair');
    expect(within(row).getByTestId('cell-recipient_name')).toHaveTextContent('meera@example.com');
    expect(within(row).getByTestId('cell-amount')).toHaveTextContent('₹15,000.00');
    expect(within(row).getByTestId('cell-category')).toHaveTextContent('Salary');
    expect(within(row).getByTestId('cell-reason')).toHaveTextContent('October salary');
    expect(within(row).getByTestId('cell-initiated_by_name')).toHaveTextContent('Finance One');
    expect(within(row).getByTestId('cell-approved_by_name')).toHaveTextContent('Finance One');
    expect(within(row).getByTestId('cell-status')).toHaveTextContent('Paid');
    expect(within(row).getByTestId('cell-razorpay_payout_id')).toHaveTextContent('pout_9');
    expect(within(row).getByTestId('cell-utr')).toHaveTextContent('UTR9');
    // Paid: nothing left to do.
    expect(within(row).getByTestId('cell-actions')).toHaveTextContent('—');
  });

  it('shows why a failed transfer failed and lets Finance retry it', async () => {
    const sent: unknown[] = [];
    tableControls.rowsByKey = {
      sendMoneyTransfersTable: [transfer({ status: 'FAILED', razorpay_payout_id: '', utr: '', failure_reason: 'Insufficient RazorpayX balance' })],
    };
    mount([
      {
        request: { query: RETRY_SEND_MONEY_TRANSFER, variables: { id: 'sm_abc' } },
        result: () => {
          sent.push('retried');
          return { data: { retrySendMoneyTransfer: { __typename: 'SendMoneyTransfer', id: 't1', status: 'PROCESSING' } } };
        },
      },
    ]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByText('Insufficient RazorpayX balance')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'Retry payout' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Payout restarted.'));
    expect(sent).toEqual(['retried']);
  });

  it('reads details a transfer does not have as a dash', async () => {
    tableControls.rowsByKey = {
      sendMoneyTransfersTable: [transfer({ notes: '', supporting_reference: '', initiated_by_name: '', approved_by_name: '' })],
    };
    mount();
    const row = await screen.findByTestId('table-row');
    for (const field of ['initiated_by_name', 'approved_by_name']) {
      expect(within(row).getByTestId(`cell-${field}`)).toHaveTextContent('—');
    }
  });

  it('offers Refresh status, not a resend, for a payout Razorpay already has', async () => {
    tableControls.rowsByKey = { sendMoneyTransfersTable: [transfer({ status: 'PROCESSING', utr: '' })] };
    mount();
    expect(await screen.findByRole('button', { name: 'Refresh status' })).toBeEnabled();
  });

  it('reports a refused retry in a toast', async () => {
    tableControls.rowsByKey = { sendMoneyTransfersTable: [transfer({ status: 'FAILED' })] };
    mount([{ request: { query: RETRY_SEND_MONEY_TRANSFER, variables: { id: 'sm_abc' } }, error: new Error('retry refused') }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry payout' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('retry refused'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('says so when nothing has been sent', async () => {
    mount();
    expect(await screen.findByText('No money has been sent from here yet.')).toBeInTheDocument();
  });
});
