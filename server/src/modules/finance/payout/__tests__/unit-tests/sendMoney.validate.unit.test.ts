import type { GraphQLError } from 'graphql';
import { validateSendMoney, type SendMoneyInput } from '../../sendMoney.service';

const valid: SendMoneyInput = {
  requestId: 'req_12345678',
  recipientUserId: '66f0a1b2c3d4e5f6a7b8c9d0',
  accountId: 'HOST:abc',
  payoutMethod: 'IMPS',
  amount: 15000,
  category: 'SALARY',
  reason: 'October salary',
  notes: '  paid late  ',
  supportingReference: ' INV-77 ',
  supportingUrl: ' https://files.example.com/slip.pdf ',
  actor: { id: '66f0a1b2c3d4e5f6a7b8c9d1', name: 'Finance One', role: 'FINANCE_MANAGER' },
};

const fieldOf = (patch: Partial<SendMoneyInput>): string | undefined => {
  try {
    validateSendMoney({ ...valid, ...patch });
  } catch (error) {
    return (error as GraphQLError).extensions?.field as string | undefined;
  }
  return undefined;
};

describe('validateSendMoney', () => {
  it('accepts a complete request and trims the free-text fields', () => {
    expect(validateSendMoney(valid)).toEqual({
      amount: 15000,
      reason: 'October salary',
      notes: 'paid late',
      supportingReference: 'INV-77',
      supportingUrl: 'https://files.example.com/slip.pdf',
    });
  });

  it('rounds the amount to paise', () => {
    expect(validateSendMoney({ ...valid, amount: 10.126 }).amount).toBe(10.13);
  });

  it.each([
    ['a missing request id', { requestId: '' }, 'request_id'],
    ['a too-short request id', { requestId: 'abc' }, 'request_id'],
    ['a request id with unsafe characters', { requestId: 'req 12345678!' }, 'request_id'],
    ['a malformed recipient', { recipientUserId: 'not-an-id' }, 'recipient_user_id'],
    ['no account chosen', { accountId: '' }, 'account_id'],
    ['a zero amount', { amount: 0 }, 'amount'],
    ['an amount under 1', { amount: 0.4 }, 'amount'],
    ['a negative amount', { amount: -50 }, 'amount'],
    ['a non-numeric amount', { amount: Number.NaN }, 'amount'],
    ['an unknown category', { category: 'BONUS' as never }, 'category'],
    ['no reason', { reason: '' }, 'reason'],
    ['a one-word shrug of a reason', { reason: 'ok' }, 'reason'],
  ])('refuses %s, naming the field', (_label, patch, field) => {
    expect(fieldOf(patch)).toBe(field);
  });

  it('accepts an account typed in instead of a verified one once the sender confirms they checked it', () => {
    const custom = { payout_method: 'UPI', upi_id: 'meera@okhdfc' };
    expect(() =>
      validateSendMoney({ ...valid, accountId: null, customAccount: custom, acknowledgeCustomAccount: true })
    ).not.toThrow();
  });

  it.each([
    ['a typed account without the sender confirming it', { accountId: null, customAccount: { payout_method: 'UPI', upi_id: 'a@ok' } }, 'acknowledge_custom_account'],
    ['a typed account the sender explicitly did not confirm', { accountId: null, customAccount: { payout_method: 'UPI', upi_id: 'a@ok' }, acknowledgeCustomAccount: false }, 'acknowledge_custom_account'],
    ['both a verified account and a typed one', { customAccount: { payout_method: 'UPI', upi_id: 'a@ok' }, acknowledgeCustomAccount: true }, 'account_id'],
    ['neither a verified account nor a typed one', { accountId: null, customAccount: null }, 'account_id'],
  ])('refuses %s, naming the field', (_label, patch, field) => {
    expect(fieldOf(patch)).toBe(field);
  });

  it('truncates an over-long note rather than refusing the payment', () => {
    expect(validateSendMoney({ ...valid, notes: 'n'.repeat(5000) }).notes).toHaveLength(1000);
  });
});
