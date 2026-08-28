import { describe, expect, it } from 'vitest';
import {
  bankAccountSchema,
  blankBankAccountValues,
  normalizeBankAccountValues,
} from '../bankAccount';

const errorsOf = async (values: unknown): Promise<string[]> => {
  const error = await bankAccountSchema
    .validate(values, { abortEarly: false })
    .then(() => null)
    .catch((e) => e);
  return error ? error.errors : [];
};

describe('bankAccountSchema', () => {
  it('requires a payout method and account holder name', async () => {
    // An empty string fails oneOf() before required() ever gets a chance to
    // report a blank value, so the reported message names the allowed values.
    const errors = (await errorsOf({ payout_method: '', account_holder_name: '' })).join(' ');
    expect(errors).toMatch(/select upi, imps or neft/i);
    expect(errors).toMatch(/account holder/i);
  });

  it('reports payout method as required when it is missing outright', async () => {
    const errors = (
      await errorsOf({ account_holder_name: 'Riya Sharma' } as Record<string, unknown>)
    ).join(' ');
    expect(errors).toMatch(/payout method is required/i);
  });

  it('rejects a payout method outside the allowed list', async () => {
    const errors = (
      await errorsOf({ payout_method: 'CASH', account_holder_name: 'Riya Sharma' })
    ).join(' ');
    expect(errors).toMatch(/select upi, imps or neft/i);
  });

  it('enforces the account holder name length bounds', async () => {
    const tooShort = (await errorsOf({ payout_method: 'UPI', account_holder_name: 'A', upi_id: 'a@bank' })).join(' ');
    expect(tooShort).toMatch(/at least 2 characters/i);

    const tooLong = (
      await errorsOf({
        payout_method: 'UPI',
        account_holder_name: 'A'.repeat(121),
        upi_id: 'a@bank',
      })
    ).join(' ');
    expect(tooLong).toMatch(/120 characters or fewer/i);
  });

  it('requires a valid UPI ID only for UPI payouts', async () => {
    const badUpi = (
      await errorsOf({ payout_method: 'UPI', account_holder_name: 'Riya Sharma', upi_id: 'bad-upi' })
    ).join(' ');
    expect(badUpi).toMatch(/valid upi id/i);

    const missingUpi = (
      await errorsOf({ payout_method: 'UPI', account_holder_name: 'Riya Sharma', upi_id: '' })
    ).join(' ');
    expect(missingUpi).toMatch(/upi id is required/i);

    // UPI ID is not validated at all for a non-UPI method.
    const neft = await errorsOf({
      payout_method: 'NEFT',
      account_holder_name: 'Riya Sharma',
      account_number: '123456789012',
      ifsc_code: 'HDFC0001234',
      upi_id: 'not-a-upi-id-at-all',
    });
    expect(neft).toEqual([]);
  });

  it('requires account number and IFSC only for IMPS/NEFT, with format checks', async () => {
    const missingBoth = (
      await errorsOf({ payout_method: 'IMPS', account_holder_name: 'Riya Sharma' })
    ).join(' ');
    expect(missingBoth).toMatch(/account number is required/i);
    expect(missingBoth).toMatch(/ifsc is required/i);

    const badFormat = (
      await errorsOf({
        payout_method: 'IMPS',
        account_holder_name: 'Riya Sharma',
        account_number: '123',
        ifsc_code: 'BADCODE',
      })
    ).join(' ');
    expect(badFormat).toMatch(/6 to 18 digits/i);
    expect(badFormat).toMatch(/format abcd0123456/i);

    // Bank rails are not required at all for a UPI payout.
    const upiOnly = await errorsOf({
      payout_method: 'UPI',
      account_holder_name: 'Riya Sharma',
      upi_id: 'name@bank',
    });
    expect(upiOnly).toEqual([]);
  });

  it('accepts valid NEFT details and normalises IFSC to uppercase', async () => {
    const values = await bankAccountSchema.validate({
      payout_method: 'NEFT',
      account_holder_name: 'Riya Sharma',
      account_number: '123456789012',
      ifsc_code: 'hdfc0001234',
    });

    expect(values.ifsc_code).toBe('HDFC0001234');
    expect(values.account_number).toBe('123456789012');
  });

  it('accepts valid IMPS details', async () => {
    const values = await bankAccountSchema.validate({
      payout_method: 'IMPS',
      account_holder_name: 'Riya Sharma',
      account_number: '654321',
      ifsc_code: 'SBIN0000456',
    });
    expect(values.payout_method).toBe('IMPS');
  });
});

describe('normalizeBankAccountValues', () => {
  it('returns blank defaults for null/undefined input', () => {
    expect(normalizeBankAccountValues(null)).toEqual(blankBankAccountValues());
    expect(normalizeBankAccountValues(undefined)).toEqual(blankBankAccountValues());
    expect(normalizeBankAccountValues()).toEqual(blankBankAccountValues());
  });

  it('uppercases and validates the payout method against the allowed list', () => {
    expect(normalizeBankAccountValues({ payout_method: 'imps' as any }).payout_method).toBe('IMPS');
    expect(normalizeBankAccountValues({ payout_method: 'cash' as any }).payout_method).toBe('');
  });

  it('trims and uppercases the persisted fields', () => {
    const values = normalizeBankAccountValues({
      account_holder_name: '  Riya Sharma  ',
      account_number: ' 123456 ',
      ifsc_code: ' sbin0000456 ',
      upi_id: ' riya@bank ',
    });
    expect(values.account_holder_name).toBe('Riya Sharma');
    expect(values.account_number).toBe('123456');
    expect(values.ifsc_code).toBe('SBIN0000456');
    expect(values.upi_id).toBe('riya@bank');
  });
});

describe('blankBankAccountValues', () => {
  it('returns an empty form shape', () => {
    expect(blankBankAccountValues()).toEqual({
      payout_method: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      upi_id: '',
    });
  });
});
