/**
 * Which action a withdrawal row offers, and how a status reads, as pure rules.
 * Getting the row action wrong either hides the only way to unstick a payout or
 * offers a second send for money Razorpay already has.
 */
import { describe, expect, it } from 'vitest';
import { rowActionOf } from '../../src/pages/finance/withdrawals-page/row-action';
import { statusLabel } from '../../src/pages/finance/withdrawals-page/status-options';
import type { WithdrawalRow } from '../../src/pages/finance/withdrawals-page/queries';
import { makeWithdrawalRow } from '../mocks/withdrawals.mock';

const row = (over: Partial<WithdrawalRow>) => makeWithdrawalRow(over);

describe('rowActionOf', () => {
  it('offers Accept on an undecided request', () => {
    expect(rowActionOf(row({}))).toBe('ACCEPT');
  });

  it('offers nothing once the withdrawal is paid or rejected', () => {
    expect(rowActionOf(row({ status: 'PAID', approval_status: 'APPROVED', payout_status: 'PAID' }))).toBe('NONE');
    expect(rowActionOf(row({ status: 'REJECTED', approval_status: 'REJECTED' }))).toBe('NONE');
  });

  it('offers Retry for a failed payout', () => {
    expect(rowActionOf(row({ approval_status: 'APPROVED', payout_status: 'FAILED' }))).toBe('RETRY');
  });

  it('offers Refresh for a payout Razorpay has, and a resend for one it may not have', () => {
    const processing = { approval_status: 'APPROVED', payout_status: 'PROCESSING' } as const;
    expect(rowActionOf(row({ ...processing, razorpay_payout_id: 'pout_1' }))).toBe('REFRESH');
    expect(rowActionOf(row({ ...processing, razorpay_payout_id: '' }))).toBe('RETRY');
  });

  it('offers nothing for an approved withdrawal that has no payout state yet', () => {
    expect(rowActionOf(row({ approval_status: 'APPROVED', payout_status: null }))).toBe('NONE');
  });
});

describe('statusLabel', () => {
  const t = (key: string) => key;

  it('translates every status the tables show', () => {
    expect(statusLabel(t, 'PARTIALLY_APPROVED')).toBe('finance.payouts.statusPartiallyApproved');
    expect(statusLabel(t, 'PAID')).toBe('finance.withdrawals.paid');
    expect(statusLabel(t, 'FAILED')).toBe('finance.payouts.statusFailed');
  });

  it('shows a status it does not know as itself rather than as nothing', () => {
    expect(statusLabel(t, 'SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});
