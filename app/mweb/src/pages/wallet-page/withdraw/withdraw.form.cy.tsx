import { describe, expect, it } from 'vitest';
import { buildWithdrawInput, buildWithdrawSchema } from './withdraw.form';
import { blankWithdrawValues, type WithdrawValues } from './withdraw.types';

const valid = (over: Partial<WithdrawValues> = {}): WithdrawValues => ({
  ...blankWithdrawValues,
  amount: '500',
  payout_method: 'UPI',
  upi_id: 'asha@upi',
  ...over,
});

const issues = (max: number, values: WithdrawValues) => {
  const r = buildWithdrawSchema(max).safeParse(values);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('buildWithdrawSchema', () => {
  it('accepts a valid UPI withdrawal within balance', () => {
    expect(buildWithdrawSchema(1000).safeParse(valid()).success).toBe(true);
  });

  it('rejects an amount over the balance or non-positive', () => {
    expect(issues(100, valid({ amount: '500' }))).toContain('amount');
    expect(issues(1000, valid({ amount: '0' }))).toContain('amount');
  });

  it('requires UPI id for UPI and account+ifsc for bank methods', () => {
    expect(issues(1000, valid({ upi_id: '' }))).toContain('upi_id');
    const bank = issues(1000, valid({ payout_method: 'IMPS', upi_id: '', account_number: '', ifsc_code: '' }));
    expect(bank).toContain('account_number');
    expect(bank).toContain('ifsc_code');
  });
});

describe('buildWithdrawInput', () => {
  it('maps to the server input, omitting blanks', () => {
    const input = buildWithdrawInput(valid({ amount: '750' }));
    expect(input.amount).toBe(750);
    expect(input.payout_method).toBe('UPI');
    expect(input.upi_id).toBe('asha@upi');
    expect(input.account_number).toBeUndefined();
  });
});
