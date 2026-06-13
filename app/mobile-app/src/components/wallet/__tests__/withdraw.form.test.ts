import {
  blankWithdrawValues,
  buildWithdrawInput,
  buildWithdrawSchema,
  type WithdrawValues,
} from '../withdraw.form';
import { WithdrawalMethod } from '@/generated/graphql/graphql';

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

  it('rejects an amount over balance or non-positive', () => {
    expect(issues(100, valid({ amount: '500' }))).toContain('amount');
    expect(issues(1000, valid({ amount: '0' }))).toContain('amount');
  });

  it('requires UPI id for UPI and account+ifsc for bank methods', () => {
    expect(issues(1000, valid({ upi_id: '' }))).toContain('upi_id');
    const bank = issues(
      1000,
      valid({ payout_method: 'NEFT', upi_id: '', account_number: '', ifsc_code: '' }),
    );
    expect(bank).toContain('account_number');
    expect(bank).toContain('ifsc_code');
    expect(
      buildWithdrawSchema(1000).safeParse(
        valid({ payout_method: 'IMPS', upi_id: '', account_number: '123', ifsc_code: 'HDFC0001' }),
      ).success,
    ).toBe(true);
  });
});

describe('buildWithdrawInput', () => {
  it('maps a UPI withdrawal, omitting bank blanks', () => {
    const input = buildWithdrawInput(valid({ amount: '750' }));
    expect(input.amount).toBe(750);
    expect(input.payout_method).toBe(WithdrawalMethod.Upi);
    expect(input.upi_id).toBe('asha@upi');
    expect(input.account_number).toBeUndefined();
  });

  it('maps a bank withdrawal with account fields', () => {
    const input = buildWithdrawInput(
      valid({
        payout_method: 'IMPS',
        upi_id: '',
        account_holder_name: 'Asha',
        account_number: '123',
        ifsc_code: 'HDFC0001',
      }),
    );
    expect(input.payout_method).toBe(WithdrawalMethod.Imps);
    expect(input.account_number).toBe('123');
    expect(input.upi_id).toBeUndefined();
  });
});
