jest.mock('@modules/finance/wallet/wallet.service', () => ({ refundWithdrawal: jest.fn(), walletService: {}, withdrawalPub: jest.fn() }));
jest.mock('../../payout.accounts', () => ({ verifiedAccountsFor: jest.fn(), matchVerified: jest.fn() }));

import type { GraphQLError } from 'graphql';
import type { IWalletWithdrawal } from '@modules/finance/wallet/wallet.model';
import { trimAllocations } from '@modules/finance/wallet/withdrawal-allocation';
import { canDecide, checkAccount, validateDecision } from '../../withdrawal.decision';
import { matchVerified, verifiedAccountsFor } from '../../payout.accounts';

const fieldOf = (run: () => unknown): string | undefined => {
  try {
    run();
  } catch (error) {
    return (error as GraphQLError).extensions?.field as string | undefined;
  }
  return undefined;
};

describe('validateDecision', () => {
  it('approves in full without needing a reason', () => {
    expect(validateDecision({ decision: 'APPROVE' }, 1000)).toEqual({ reason: '', approved: 1000 });
  });

  it('refuses a rejection without a reason, naming the field', () => {
    expect(fieldOf(() => validateDecision({ decision: 'REJECT', reason: '  ' }, 1000))).toBe('reason');
    expect(fieldOf(() => validateDecision({ decision: 'REJECT', reason: 'ab' }, 1000))).toBe('reason');
  });

  it('accepts a rejection with a reason and trims it', () => {
    expect(validateDecision({ decision: 'REJECT', reason: '  Bank details unclear ' }, 1000).reason).toBe('Bank details unclear');
  });

  it('truncates an over-long reason to the 500 characters the log stores', () => {
    expect(validateDecision({ decision: 'REJECT', reason: 'x'.repeat(900) }, 1000).reason).toHaveLength(500);
  });

  it('requires a reason for a partial approval', () => {
    expect(fieldOf(() => validateDecision({ decision: 'PARTIAL', approvedAmount: 500 }, 1000))).toBe('reason');
  });

  it.each([
    ['nothing', undefined],
    ['zero', 0],
    ['a negative', -5],
    ['not a number', Number.NaN],
  ])('refuses a partial approval of %s', (_label, amount) => {
    expect(fieldOf(() => validateDecision({ decision: 'PARTIAL', approvedAmount: amount, reason: 'On hold' }, 1000))).toBe(
      'approved_amount'
    );
  });

  it('refuses a partial approval below 1, which the withdrawal record cannot hold', () => {
    expect(fieldOf(() => validateDecision({ decision: 'PARTIAL', approvedAmount: 0.5, reason: 'On hold' }, 1000))).toBe(
      'approved_amount'
    );
  });

  it('refuses a "partial" approval equal to or above the request — that is a full approval', () => {
    expect(fieldOf(() => validateDecision({ decision: 'PARTIAL', approvedAmount: 1000, reason: 'On hold' }, 1000))).toBe(
      'approved_amount'
    );
    expect(fieldOf(() => validateDecision({ decision: 'PARTIAL', approvedAmount: 1200, reason: 'On hold' }, 1000))).toBe(
      'approved_amount'
    );
  });

  it('accepts a partial approval between 1 and the request, rounded to paise', () => {
    expect(validateDecision({ decision: 'PARTIAL', approvedAmount: 999.994, reason: 'On hold' }, 1000)).toMatchObject({
      approved: 999.99,
    });
    expect(validateDecision({ decision: 'PARTIAL', approvedAmount: 1, reason: 'On hold' }, 1000).approved).toBe(1);
  });

  it('refuses an amount that rounds up to the full request, since that is not partial', () => {
    expect(fieldOf(() => validateDecision({ decision: 'PARTIAL', approvedAmount: 999.999, reason: 'On hold' }, 1000))).toBe(
      'approved_amount'
    );
  });
});

describe('canDecide', () => {
  const row = (patch: Partial<IWalletWithdrawal>) => ({ status: 'PENDING', amount: 100, ...patch }) as IWalletWithdrawal;

  it('lets a fresh request be decided any way', () => {
    expect(canDecide(row({}), 'APPROVE')).toBe(true);
    expect(canDecide(row({}), 'PARTIAL')).toBe(true);
    expect(canDecide(row({}), 'REJECT')).toBe(true);
  });

  it('refuses a second decision on one that was already approved and is processing', () => {
    const approved = row({ approval_status: 'APPROVED', payout: { status: 'PROCESSING' } as never });
    expect(canDecide(approved, 'APPROVE')).toBe(false);
    expect(canDecide(approved, 'REJECT')).toBe(false);
  });

  it('refuses anything on a paid or rejected row', () => {
    expect(canDecide(row({ status: 'PAID', approval_status: 'APPROVED' }), 'REJECT')).toBe(false);
    expect(canDecide(row({ status: 'REJECTED', approval_status: 'REJECTED' }), 'APPROVE')).toBe(false);
  });

  it('allows ONLY a rejection once an approved payout has failed — nothing was paid', () => {
    const failed = row({ approval_status: 'APPROVED', payout: { status: 'FAILED' } as never });
    expect(canDecide(failed, 'REJECT')).toBe(true);
    expect(canDecide(failed, 'APPROVE')).toBe(false);
    expect(canDecide(failed, 'PARTIAL')).toBe(false);
  });
});

describe('checkAccount', () => {
  const withdrawal = {
    user_id: '66f0a1b2c3d4e5f6a7b8c9d0',
    beneficiary_name: 'Meera N',
    beneficiary_email: 'm@x.com',
    payout_method: 'IMPS',
    account_holder_name: 'Meera Nair',
    account_number: '123456789012',
    ifsc_code: 'HDFC0001234',
    upi_id: '',
  } as unknown as IWalletWithdrawal;

  beforeEach(() => {
    (verifiedAccountsFor as jest.Mock).mockResolvedValue([]);
  });

  it('refuses an account that is not on a verified record until Finance acknowledges it', async () => {
    (matchVerified as jest.Mock).mockReturnValue(null);
    await expect(checkAccount(withdrawal, false)).rejects.toMatchObject({
      extensions: { code: 'UNVERIFIED_ACCOUNT', field: 'acknowledge_unverified_account' },
    });
  });

  it('lets Finance pay an unverified account once they acknowledge it', async () => {
    (matchVerified as jest.Mock).mockReturnValue(null);
    await expect(checkAccount(withdrawal, true)).resolves.toBeNull();
  });

  it('passes a verified account without any acknowledgement', async () => {
    const verified = { id: 'HOST:1', source: 'HOST' };
    (matchVerified as jest.Mock).mockReturnValue(verified);
    await expect(checkAccount(withdrawal, false)).resolves.toBe(verified);
  });

  it('refuses a malformed account before it ever looks for a verified one', async () => {
    await expect(checkAccount({ ...withdrawal, ifsc_code: 'nope' } as IWalletWithdrawal, true)).rejects.toThrow('IFSC');
    expect(verifiedAccountsFor).not.toHaveBeenCalled();
  });
});

describe('trimAllocations (partial approval)', () => {
  const slices = [
    { pod: 'a', amount: 300 },
    { pod: 'b', amount: 500 },
    { pod: 'c', amount: 200 },
  ];

  it('keeps the oldest slices until the approved amount is reached, shortening the last', () => {
    expect(trimAllocations(slices, 600)).toEqual([
      { pod: 'a', amount: 300 },
      { pod: 'b', amount: 300 },
    ]);
  });

  it('keeps everything when the approved amount covers it all', () => {
    expect(trimAllocations(slices, 1000)).toEqual(slices);
    expect(trimAllocations(slices, 5000)).toEqual(slices);
  });

  it('keeps nothing for a zero approval and never mutates its input', () => {
    const copy = JSON.parse(JSON.stringify(slices));
    expect(trimAllocations(slices, 0)).toEqual([]);
    trimAllocations(slices, 450);
    expect(slices).toEqual(copy);
  });

  it('keeps a total that equals the approved amount to the paisa', () => {
    const kept = trimAllocations([{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.34 }], 66.67);
    expect(Math.round(kept.reduce((sum, s) => sum + s.amount, 0) * 100)).toBe(6667);
  });
});
