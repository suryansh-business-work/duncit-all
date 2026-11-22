const gateway = {
  createContact: jest.fn(),
  createFundAccount: jest.fn(),
  createPayout: jest.fn(),
  isPayoutConfigured: jest.fn(),
};

jest.mock('../../razorpayX.gateway', () => ({
  ...jest.requireActual('../../razorpayX.gateway'),
  createContact: (...a: unknown[]) => gateway.createContact(...a),
  createFundAccount: (...a: unknown[]) => gateway.createFundAccount(...a),
  createPayout: (...a: unknown[]) => gateway.createPayout(...a),
  isPayoutConfigured: () => gateway.isPayoutConfigured(),
}));

import { GraphQLError } from 'graphql';
import {
  assertPayoutsConfigured,
  destinationOf,
  executePayout,
  idempotencyKeyFor,
  toPaise,
  type PayoutPayee,
} from '../../payout.dispatch';
import { payoutOutcomeOf } from '../../razorpayX.gateway';

const bank: PayoutPayee = {
  name: 'Meera N',
  email: 'meera@example.com',
  method: 'IMPS',
  account_holder_name: 'Meera Nair',
  account_number: '123456789012',
  ifsc_code: 'hdfc0001234',
  upi_id: '',
};
const upi: PayoutPayee = { ...bank, method: 'UPI', account_number: '', ifsc_code: '', upi_id: 'meera@okhdfc' };

const args = (payee = bank) => ({
  payee,
  amount: 2500.5,
  purpose: 'payout' as const,
  reference: 'wd_abc',
  narration: 'Duncit withdrawal',
  idempotencyKey: 'wd_abc:1',
});

const rejection = (status: number) =>
  new GraphQLError('refused', { extensions: { code: 'BAD_REQUEST', razorpay_status: status } });

beforeEach(() => {
  gateway.createContact.mockResolvedValue('cont_1');
  gateway.createFundAccount.mockResolvedValue('fa_1');
});

describe('toPaise / idempotencyKeyFor', () => {
  it('converts rupees to integer paise without float drift', () => {
    expect(toPaise(2500.5)).toBe(250050);
    expect(toPaise(0.29)).toBe(29);
    expect(toPaise(19.99)).toBe(1999);
  });

  it('keys a payout by record and attempt', () => {
    expect(idempotencyKeyFor('wd_abc', 1)).toBe('wd_abc:1');
    expect(idempotencyKeyFor('wd_abc', 2)).not.toBe(idempotencyKeyFor('wd_abc', 1));
  });
});

describe('payoutOutcomeOf', () => {
  it.each([
    ['processed', 'PAID'],
    ['failed', 'FAILED'],
    ['rejected', 'FAILED'],
    ['cancelled', 'FAILED'],
    ['reversed', 'FAILED'],
    ['queued', 'PROCESSING'],
    ['pending', 'PROCESSING'],
    ['processing', 'PROCESSING'],
    ['something-new', 'PROCESSING'],
  ])('maps %s to %s', (status, outcome) => {
    expect(payoutOutcomeOf(status)).toBe(outcome);
  });
});

describe('destinationOf', () => {
  it('builds a bank destination with an upper-cased IFSC and the holder name', () => {
    expect(destinationOf(bank)).toEqual({
      kind: 'BANK',
      name: 'Meera Nair',
      account_number: '123456789012',
      ifsc: 'HDFC0001234',
    });
  });

  it('falls back to the payee name when the account holder is blank', () => {
    expect(destinationOf({ ...bank, account_holder_name: '  ' })).toMatchObject({ name: 'Meera N' });
  });

  it('builds a UPI destination', () => {
    expect(destinationOf(upi)).toEqual({ kind: 'UPI', name: 'Meera Nair', upi_id: 'meera@okhdfc' });
  });

  it.each([
    ['a malformed account number', { account_number: '12AB' }, 'account_number'],
    ['a malformed IFSC', { ifsc_code: 'HDFC1234' }, 'ifsc_code'],
    ['a missing holder name', { account_holder_name: '', name: ' ' }, 'account_holder_name'],
  ])('refuses %s with a field-level error', (_label, patch, field) => {
    try {
      destinationOf({ ...bank, ...patch });
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as GraphQLError).extensions).toMatchObject({ code: 'BAD_USER_INPUT', field });
    }
  });

  it('refuses a malformed UPI id', () => {
    expect(() => destinationOf({ ...upi, upi_id: 'not-a-upi' })).toThrow('UPI ID');
  });
});

describe('assertPayoutsConfigured', () => {
  it('passes when keys and the RazorpayX account exist', async () => {
    gateway.isPayoutConfigured.mockResolvedValue(true);
    await expect(assertPayoutsConfigured()).resolves.toBeUndefined();
  });

  it('refuses with a message that points at the Tech portal when they do not', async () => {
    gateway.isPayoutConfigured.mockResolvedValue(false);
    await expect(assertPayoutsConfigured()).rejects.toThrow('Tech portal');
  });
});

describe('executePayout', () => {
  it('creates the contact, the fund account and the payout, and reports PROCESSING', async () => {
    gateway.createPayout.mockResolvedValue({ id: 'pout_1', status: 'queued', utr: '', failure_reason: '', reference_id: 'wd_abc' });
    const result = await executePayout(args());
    expect(result).toMatchObject({ outcome: 'PROCESSING', contact_id: 'cont_1', fund_account_id: 'fa_1' });
    expect(result.payout?.id).toBe('pout_1');
    expect(gateway.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({
        fundAccountId: 'fa_1',
        amountPaise: 250050,
        mode: 'IMPS',
        reference: 'wd_abc',
        idempotencyKey: 'wd_abc:1',
      })
    );
  });

  it('only calls it PAID when Razorpay itself says processed', async () => {
    gateway.createPayout.mockResolvedValue({ id: 'pout_1', status: 'processed', utr: 'UTR9', failure_reason: '', reference_id: 'wd_abc' });
    const result = await executePayout(args());
    expect(result.outcome).toBe('PAID');
    expect(result.payout?.utr).toBe('UTR9');
  });

  it('reports FAILED with the reason when Razorpay answers failed', async () => {
    gateway.createPayout.mockResolvedValue({ id: 'pout_1', status: 'failed', utr: '', failure_reason: 'Beneficiary bank offline', reference_id: 'wd_abc' });
    const result = await executePayout(args());
    expect(result).toMatchObject({ outcome: 'FAILED', failure_reason: 'Beneficiary bank offline' });
  });

  it('reports FAILED when Razorpay refuses the payout with a 4xx — nothing was sent', async () => {
    gateway.createPayout.mockRejectedValue(rejection(400));
    const result = await executePayout(args());
    expect(result).toMatchObject({ outcome: 'FAILED', failure_reason: 'refused' });
  });

  it('reports UNKNOWN, not FAILED, on a timeout or 5xx — the payout may exist', async () => {
    gateway.createPayout.mockRejectedValue(rejection(502));
    expect((await executePayout(args())).outcome).toBe('UNKNOWN');
    gateway.createPayout.mockRejectedValue(new Error('fetch failed'));
    expect((await executePayout(args())).outcome).toBe('UNKNOWN');
  });

  it('fails cleanly, before any payout request, when the contact cannot be created', async () => {
    gateway.createContact.mockRejectedValue(rejection(400));
    const result = await executePayout(args());
    expect(result.outcome).toBe('FAILED');
    expect(gateway.createPayout).not.toHaveBeenCalled();
  });

  it('reuses ids from an earlier attempt instead of creating new contacts', async () => {
    gateway.createPayout.mockResolvedValue({ id: 'pout_2', status: 'queued', utr: '', failure_reason: '', reference_id: 'wd_abc' });
    const result = await executePayout({ ...args(), known: { contact_id: 'cont_old', fund_account_id: 'fa_old' } });
    expect(gateway.createContact).not.toHaveBeenCalled();
    expect(gateway.createFundAccount).not.toHaveBeenCalled();
    expect(result).toMatchObject({ contact_id: 'cont_old', fund_account_id: 'fa_old' });
  });

  it('validates the destination before talking to Razorpay at all', async () => {
    await expect(executePayout(args({ ...bank, ifsc_code: 'bad' }))).rejects.toThrow('IFSC');
    expect(gateway.createContact).not.toHaveBeenCalled();
  });

  it('pays a UPI payee in UPI mode', async () => {
    gateway.createPayout.mockResolvedValue({ id: 'pout_3', status: 'queued', utr: '', failure_reason: '', reference_id: 'wd_abc' });
    await executePayout(args(upi));
    expect(gateway.createFundAccount).toHaveBeenCalledWith('cont_1', expect.objectContaining({ kind: 'UPI' }));
    expect(gateway.createPayout).toHaveBeenCalledWith(expect.objectContaining({ mode: 'UPI' }));
  });
});
