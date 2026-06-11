import { describe, expect, it } from 'vitest';
import {
  bankAccountSchema,
  blankBankAccountValues,
  normalizeBankAccountValues,
} from './bankAccount';

const base = blankBankAccountValues();

describe('blankBankAccountValues', () => {
  it('returns an empty account', () => {
    expect(blankBankAccountValues()).toEqual({
      payout_method: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      upi_id: '',
    });
  });
});

describe('bankAccountSchema', () => {
  it('requires a payout method and holder name', async () => {
    await expect(bankAccountSchema.isValid(base)).resolves.toBe(false);
  });

  it('validates a UPI payout', async () => {
    const valid = { ...base, payout_method: 'UPI', account_holder_name: 'Asha', upi_id: 'asha@okhdfc' };
    await expect(bankAccountSchema.isValid(valid)).resolves.toBe(true);
    await expect(
      bankAccountSchema.isValid({ ...valid, upi_id: 'invalid upi' }),
    ).resolves.toBe(false);
  });

  it('validates IMPS/NEFT bank rails', async () => {
    const valid = {
      ...base,
      payout_method: 'NEFT',
      account_holder_name: 'Asha',
      account_number: '123456789',
      ifsc_code: 'HDFC0123456',
    };
    await expect(bankAccountSchema.isValid(valid)).resolves.toBe(true);
    await expect(
      bankAccountSchema.isValid({ ...valid, ifsc_code: 'BAD' }),
    ).resolves.toBe(false);
    await expect(
      bankAccountSchema.isValid({ ...valid, account_number: '12' }),
    ).resolves.toBe(false);
  });
});

describe('normalizeBankAccountValues', () => {
  it('defaults when given nothing', () => {
    expect(normalizeBankAccountValues(null)).toEqual(blankBankAccountValues());
  });

  it('uppercases method/ifsc and keeps valid values', () => {
    expect(
      normalizeBankAccountValues({
        payout_method: 'upi' as never,
        account_holder_name: '  Asha  ',
        ifsc_code: 'hdfc0123456',
        upi_id: 'asha@okhdfc',
        account_number: ' 123 ',
      }),
    ).toMatchObject({
      payout_method: 'UPI',
      account_holder_name: 'Asha',
      ifsc_code: 'HDFC0123456',
      account_number: '123',
    });
  });

  it('drops an unknown payout method', () => {
    expect(normalizeBankAccountValues({ payout_method: 'CHEQUE' as never }).payout_method).toBe('');
  });
});
