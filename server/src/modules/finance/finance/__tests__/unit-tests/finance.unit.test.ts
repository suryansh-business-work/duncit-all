import {
  normalizeBankAccountInput,
  toBankAccountPub,
  blankBankAccount,
} from '../../bankAccount';
import { financeResolvers } from '../../finance.resolver';
import { makeContext } from '@test/harness';

describe('finance unit', () => {
  it('normalizeBankAccountInput uppercases method/ifsc and trims', () => {
    const out = normalizeBankAccountInput({
      payout_method: 'upi',
      account_holder_name: '  Asha  ',
      ifsc_code: 'hdfc0001',
      upi_id: 'asha@upi',
    });
    expect(out.payout_method).toBe('UPI');
    expect(out.account_holder_name).toBe('Asha');
    expect(out.ifsc_code).toBe('HDFC0001');
  });

  it('drops an unsupported payout method', () => {
    expect(normalizeBankAccountInput({ payout_method: 'crypto' }).payout_method).toBe('');
  });

  it('toBankAccountPub maps an empty method to null', () => {
    expect(toBankAccountPub({}).payout_method).toBeNull();
    expect(blankBankAccount().account_number).toBe('');
  });

  it('paymentReleaseRequests query is gated to admin roles', async () => {
    await expect(
      (financeResolvers.Query as any).paymentReleaseRequests({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
