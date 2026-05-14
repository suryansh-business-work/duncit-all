import { describe, expect, it } from 'vitest';
import { bankAccountSchema, normalizeBankAccountValues } from './bankAccount';

describe('bank account validation schema', () => {
  it('requires a payout method and account holder name', async () => {
    const error = await bankAccountSchema
      .validate({ payout_method: '', account_holder_name: '' }, { abortEarly: false })
      .catch((e) => e);

    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/payout method/i);
    expect(error.errors.join(' ')).toMatch(/account holder/i);
  });

  it('requires a valid UPI ID for UPI payouts', async () => {
    const error = await bankAccountSchema
      .validate(
        { payout_method: 'UPI', account_holder_name: 'Riya Sharma', upi_id: 'bad-upi' },
        { abortEarly: false },
      )
      .catch((e) => e);

    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/upi id/i);
  });

  it('accepts valid NEFT account details and normalises IFSC', async () => {
    const values = await bankAccountSchema.validate({
      payout_method: 'NEFT',
      account_holder_name: 'Riya Sharma',
      account_number: '123456789012',
      ifsc_code: 'hdfc0001234',
    });

    expect(values.ifsc_code).toBe('HDFC0001234');
  });

  it('normalises persisted bank values for edit forms', () => {
    const values = normalizeBankAccountValues({ payout_method: 'imps' as any, ifsc_code: 'sbin0000456' });

    expect(values.payout_method).toBe('IMPS');
    expect(values.ifsc_code).toBe('SBIN0000456');
  });
});