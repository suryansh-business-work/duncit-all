import { describe, expect, it } from 'vitest';
import { castHostBankAccount, hostBankAccountSchema } from './host-bank-account';
import { blankBankAccountValues } from '../validation/bankAccount';

const base = blankBankAccountValues();

const messages = (value: unknown) => {
  const result = hostBankAccountSchema.safeParse(value);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
};

describe('hostBankAccountSchema', () => {
  it('reports required payout method and holder name on a blank account', () => {
    const errs = messages(base);
    expect(errs.payout_method).toBe('Select UPI, IMPS or NEFT');
    expect(errs.account_holder_name).toBe('Account holder name is required');
  });

  it('flags a short and an over-long holder name', () => {
    expect(messages({ ...base, payout_method: 'UPI', account_holder_name: 'A', upi_id: 'a@okhdfc' }).account_holder_name).toBe(
      'Account holder name must be at least 2 characters',
    );
    expect(
      messages({ ...base, payout_method: 'UPI', account_holder_name: 'x'.repeat(121), upi_id: 'a@okhdfc' })
        .account_holder_name,
    ).toBe('Account holder name must be 120 characters or fewer');
  });

  it('validates a UPI payout and its errors', () => {
    const valid = { ...base, payout_method: 'UPI', account_holder_name: 'Asha', upi_id: 'asha@okhdfc' };
    expect(hostBankAccountSchema.safeParse(valid).success).toBe(true);
    expect(messages({ ...valid, upi_id: '' }).upi_id).toBe('UPI ID is required');
    expect(messages({ ...valid, upi_id: 'invalid upi' }).upi_id).toBe('Enter a valid UPI ID');
  });

  it('validates IMPS/NEFT bank rails and their errors', () => {
    const valid = {
      ...base,
      payout_method: 'NEFT',
      account_holder_name: 'Asha',
      account_number: '123456789',
      ifsc_code: 'HDFC0123456',
    };
    expect(hostBankAccountSchema.safeParse(valid).success).toBe(true);
    expect(messages({ ...valid, account_number: '' }).account_number).toBe('Account number is required');
    expect(messages({ ...valid, account_number: '12' }).account_number).toBe('Account number must be 6 to 18 digits');
    expect(messages({ ...valid, ifsc_code: '' }).ifsc_code).toBe('IFSC is required');
    expect(messages({ ...valid, ifsc_code: 'BAD' }).ifsc_code).toBe('IFSC must use format ABCD0123456');
  });
});

describe('castHostBankAccount', () => {
  it('trims and uppercases a valid account', () => {
    expect(
      castHostBankAccount({
        payout_method: 'NEFT',
        account_holder_name: '  Asha  ',
        account_number: ' 123456789 ',
        ifsc_code: 'hdfc0123456',
        upi_id: '',
      }),
    ).toEqual({
      payout_method: 'NEFT',
      account_holder_name: 'Asha',
      account_number: '123456789',
      ifsc_code: 'HDFC0123456',
      upi_id: '',
    });
  });

  it('falls back to a blank account when parsing fails', () => {
    expect(castHostBankAccount(base)).toEqual(blankBankAccountValues());
  });
});
