import { describe, expect, it } from 'vitest';
import {
  bankAccountSchema,
  blankBankAccountValues,
  normalizeBankAccountValues,
} from './bankAccount';

const base = blankBankAccountValues();

const isValid = (value: unknown) => bankAccountSchema.safeParse(value).success;

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
  it('requires a payout method and holder name', () => {
    expect(isValid(base)).toBe(false);
    expect(isValid({ ...base, payout_method: undefined })).toBe(false);
  });

  it('validates a UPI payout', () => {
    const valid = { ...base, payout_method: 'UPI', account_holder_name: 'Asha', upi_id: 'asha@okhdfc' };
    expect(isValid(valid)).toBe(true);
    expect(isValid({ ...valid, upi_id: 'invalid upi' })).toBe(false);
    expect(isValid({ ...valid, upi_id: '' })).toBe(false);
  });

  it('validates IMPS/NEFT bank rails', () => {
    const valid = {
      ...base,
      payout_method: 'NEFT',
      account_holder_name: 'Asha',
      account_number: '123456789',
      ifsc_code: 'HDFC0123456',
    };
    expect(isValid(valid)).toBe(true);
    expect(isValid({ ...valid, ifsc_code: 'BAD' })).toBe(false);
    expect(isValid({ ...valid, account_number: '12' })).toBe(false);
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
