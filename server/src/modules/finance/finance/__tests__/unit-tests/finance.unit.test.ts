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

  // The grouped Payment Release surface moves money, so every door onto it is
  // closed to anyone who is not Finance — before a single row is read.
  it.each([
    ['Query', 'podPaymentReleasesTable', { query: {} }],
    ['Query', 'podPaymentRelease', { id: 'set_abc' }],
    ['Mutation', 'approvePodPaymentRelease', { id: 'set_abc' }],
  ] as const)('%s.%s is gated to finance roles', async (type, field, args) => {
    const resolver = (financeResolvers[type] as any)[field];
    for (const roles of [['USER'], ['HOST'], ['ONBOARDING_MANAGER'], ['ZONAL_ADMIN']]) {
      await expect(resolver({}, args, makeContext({ roles }))).rejects.toThrow(/access denied/i);
    }
    // Signed out is refused too, not treated as "no roles to check".
    await expect(resolver({}, args, makeContext(null))).rejects.toThrow();
  });
});
