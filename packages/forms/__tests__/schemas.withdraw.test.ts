/**
 * The wallet withdrawal contract, which lived in three places.
 *
 * The floor is the rule worth pinning: the server enforces BOTH `balance >= min`
 * and `amount >= min`, so validating only the balance let somebody with a
 * healthy wallet submit an under-floor amount and meet a raw server error
 * instead of a field message.
 */
import { describe, expect, it } from 'vitest';

import {
  blankWithdrawValues,
  buildWithdrawInput,
  makeWithdrawSchema,
  WITHDRAW_METHODS,
  type WithdrawValues,
} from '../src/schemas';

const t = (key: string) => key;
const schemaFor = (max: number, min = 0) => makeWithdrawSchema(max, min, t);

const upi = (over: Partial<WithdrawValues> = {}): WithdrawValues => ({
  ...blankWithdrawValues,
  amount: '500',
  payout_method: 'UPI',
  upi_id: 'meera@okhdfcbank',
  ...over,
});

const bank = (over: Partial<WithdrawValues> = {}): WithdrawValues => ({
  ...blankWithdrawValues,
  amount: '500',
  payout_method: 'IMPS',
  account_holder_name: 'Meera Nair',
  account_number: '50100234567890',
  ifsc_code: 'HDFC0000123',
  ...over,
});

const messagesFor = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

const pathsFor = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('WITHDRAW_METHODS', () => {
  it('lists the three the server accepts, in picker order', () => {
    expect(WITHDRAW_METHODS).toEqual(['UPI', 'IMPS', 'NEFT']);
  });
});

describe('makeWithdrawSchema — the amount', () => {
  it('accepts an amount inside the balance', () => {
    expect(schemaFor(1000).safeParse(upi()).success).toBe(true);
  });

  it('refuses zero, blank and negative', () => {
    for (const amount of ['0', '', '-100']) {
      expect(messagesFor(schemaFor(1000).safeParse(upi({ amount }))), amount).toContain(
        'withdraw.enterAnAmount',
      );
    }
  });

  it('refuses more than the wallet holds', () => {
    expect(messagesFor(schemaFor(1000).safeParse(upi({ amount: '1001' })))).toContain(
      'withdraw.maxAmount',
    );
    expect(schemaFor(1000).safeParse(upi({ amount: '1000' })).success).toBe(true);
  });

  it('refuses an under-floor amount even when the balance is healthy', () => {
    // The bug this rule exists for: balance 10,000, floor 500, request 100.
    expect(messagesFor(schemaFor(10_000, 500).safeParse(upi({ amount: '100' })))).toContain(
      'withdraw.minimumAmount',
    );
    expect(schemaFor(10_000, 500).safeParse(upi({ amount: '500' })).success).toBe(true);
  });

  it('treats a floor of 0 as no floor at all', () => {
    expect(schemaFor(10_000, 0).safeParse(upi({ amount: '1' })).success).toBe(true);
  });
});

describe('makeWithdrawSchema — the payout details', () => {
  it('asks a UPI payout for a UPI id, and nothing else', () => {
    expect(schemaFor(1000).safeParse(upi()).success).toBe(true);
    const missing = schemaFor(1000).safeParse(upi({ upi_id: '' }));
    expect(pathsFor(missing)).toEqual(['upi_id']);
    expect(messagesFor(missing)).toContain('withdraw.enterYourUpiId');
  });

  it('asks a bank payout for an account number and an IFSC code', () => {
    expect(schemaFor(1000).safeParse(bank()).success).toBe(true);
    const missing = schemaFor(1000).safeParse(bank({ account_number: '', ifsc_code: '' }));
    expect(pathsFor(missing)).toEqual(['account_number', 'ifsc_code']);
    expect(messagesFor(missing)).toEqual([
      'withdraw.enterAccountNumber',
      'withdraw.enterIfscCode',
    ]);
  });

  it('applies the bank rules to NEFT as well as IMPS', () => {
    expect(schemaFor(1000).safeParse(bank({ payout_method: 'NEFT' })).success).toBe(true);
    expect(pathsFor(schemaFor(1000).safeParse(bank({ payout_method: 'NEFT', ifsc_code: '' })))).toEqual(
      ['ifsc_code'],
    );
  });

  it('does not ask a UPI payout for bank details, or the reverse', () => {
    expect(schemaFor(1000).safeParse(upi({ account_number: '', ifsc_code: '' })).success).toBe(
      true,
    );
    expect(schemaFor(1000).safeParse(bank({ upi_id: '' })).success).toBe(true);
  });

  it('refuses a payout method the server does not offer', () => {
    expect(
      schemaFor(1000).safeParse({ ...upi(), payout_method: 'CHEQUE' as never }).success,
    ).toBe(false);
  });
});

describe('buildWithdrawInput', () => {
  it('sends the amount as a number and drops the details that are blank', () => {
    expect(buildWithdrawInput(upi())).toEqual({
      amount: 500,
      payout_method: 'UPI',
      upi_id: 'meera@okhdfcbank',
      account_holder_name: undefined,
      account_number: undefined,
      ifsc_code: undefined,
    });
  });

  it('trims every detail on the way to the server', () => {
    const input = buildWithdrawInput(
      bank({ account_holder_name: '  Meera Nair  ', ifsc_code: ' HDFC0000123 ' }),
    );
    expect(input.account_holder_name).toBe('Meera Nair');
    expect(input.ifsc_code).toBe('HDFC0000123');
  });

  it('drops whitespace-only details rather than sending an empty string', () => {
    expect(buildWithdrawInput(upi({ upi_id: '   ' })).upi_id).toBeUndefined();
  });
});

describe('blankWithdrawValues', () => {
  it('opens on UPI with every box empty', () => {
    expect(blankWithdrawValues).toEqual({
      amount: '',
      payout_method: 'UPI',
      upi_id: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
    });
  });
});
