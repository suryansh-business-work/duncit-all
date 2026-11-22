/**
 * The two money-out forms' rules, as pure functions: the Accept dialog's
 * decision schema and the Send Money form's schema. The server enforces all of
 * them again; these pin what the form refuses BEFORE a round trip, and the exact
 * input each one hands to its mutation.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DECISION_VALUES,
  buildDecisionSchema,
  toDecisionInput,
  type DecisionFormValues,
} from '../../src/pages/finance/withdrawals-page/withdrawal-decision.schema';
import {
  EMPTY_SEND_MONEY_VALUES,
  buildSendMoneySchema,
  toSendMoneyInput,
  type SendMoneyFormValues,
} from '../../src/pages/finance/send-money-page/send-money.schema';

const decisionMessages = {
  reasonRequired: 'reason!',
  reasonTooLong: 'reason long!',
  amountRequired: 'amount!',
  amountBelowRequested: 'below!',
  amountPrecision: 'precision!',
  acknowledgeRequired: 'ack!',
};

const issuesOf = (schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, values: unknown) => {
  const result = schema.safeParse(values);
  return result.success ? {} : Object.fromEntries((result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));
};

describe('the withdrawal decision schema', () => {
  const verified = buildDecisionSchema({ requested: 1000, needsAcknowledgement: false }, decisionMessages);
  const unverified = buildDecisionSchema({ requested: 1000, needsAcknowledgement: true }, decisionMessages);
  const values = (patch: Partial<DecisionFormValues>): DecisionFormValues => ({ ...DEFAULT_DECISION_VALUES, ...patch });

  it('accepts a plain approval of a verified account with nothing else filled in', () => {
    expect(issuesOf(verified, values({}))).toEqual({});
  });

  it('requires a reason of at least 3 characters to reject or partially approve, not to approve', () => {
    expect(issuesOf(verified, values({ decision: 'REJECT', reason: ' ' })).reason).toBe('reason!');
    expect(issuesOf(verified, values({ decision: 'REJECT', reason: 'ab' })).reason).toBe('reason!');
    expect(issuesOf(verified, values({ decision: 'REJECT', reason: 'abc' }))).toEqual({});
    expect(issuesOf(verified, values({ decision: 'PARTIAL', approved_amount: '500', reason: '' })).reason).toBe('reason!');
    expect(issuesOf(verified, values({ decision: 'APPROVE', reason: '' }))).toEqual({});
  });

  it('refuses a reason over 500 characters', () => {
    expect(issuesOf(verified, values({ decision: 'REJECT', reason: 'x'.repeat(501) })).reason).toBe('reason long!');
  });

  it.each([
    ['empty', '', 'amount!'],
    ['not a number', 'abc', 'amount!'],
    ['zero', '0', 'amount!'],
    ['below 1', '0.99', 'amount!'],
    ['three decimals', '500.123', 'precision!'],
    ['equal to the request', '1000', 'below!'],
    ['above the request', '1500', 'below!'],
  ])('refuses a partial approval of %s', (_label, amount, message) => {
    expect(issuesOf(verified, values({ decision: 'PARTIAL', approved_amount: amount, reason: 'On hold' })).approved_amount).toBe(message);
  });

  it('accepts a partial approval between 1 and the request, with up to two decimals', () => {
    for (const amount of ['1', '999.99', '500.5', '250']) {
      expect(issuesOf(verified, values({ decision: 'PARTIAL', approved_amount: amount, reason: 'On hold' }))).toEqual({});
    }
  });

  it('only asks for an amount on a partial approval', () => {
    expect(issuesOf(verified, values({ decision: 'REJECT', reason: 'Nope', approved_amount: 'garbage' }))).toEqual({});
  });

  it('demands an acknowledgement to pay an unverified account — never to reject it', () => {
    expect(issuesOf(unverified, values({ decision: 'APPROVE' })).acknowledge_unverified_account).toBe('ack!');
    expect(issuesOf(unverified, values({ decision: 'PARTIAL', approved_amount: '500', reason: 'On hold' })).acknowledge_unverified_account).toBe('ack!');
    expect(issuesOf(unverified, values({ decision: 'APPROVE', acknowledge_unverified_account: true }))).toEqual({});
    expect(issuesOf(unverified, values({ decision: 'REJECT', reason: 'Nope' }))).toEqual({});
    expect(issuesOf(verified, values({ decision: 'APPROVE' })).acknowledge_unverified_account).toBeUndefined();
  });

  it('builds the mutation input for each outcome', () => {
    expect(toDecisionInput(values({ decision: 'APPROVE', reason: 'ignored', approved_amount: '5' }))).toEqual({
      decision: 'APPROVE',
      approved_amount: null,
      reason: null,
      acknowledge_unverified_account: false,
    });
    expect(
      toDecisionInput(values({ decision: 'PARTIAL', approved_amount: '300.50', reason: 'Hold', acknowledge_unverified_account: true })),
    ).toEqual({ decision: 'PARTIAL', approved_amount: 300.5, reason: 'Hold', acknowledge_unverified_account: true });
    expect(toDecisionInput(values({ decision: 'REJECT', reason: 'Nope', acknowledge_unverified_account: true }))).toEqual({
      decision: 'REJECT',
      approved_amount: null,
      reason: 'Nope',
      acknowledge_unverified_account: false,
    });
  });
});

const sendMessages = {
  recipientRequired: 'recipient!',
  accountRequired: 'account!',
  amountRequired: 'amount!',
  amountPrecision: 'precision!',
  categoryRequired: 'category!',
  reasonRequired: 'reason!',
  reasonTooLong: 'reason long!',
  notesTooLong: 'notes long!',
  referenceTooLong: 'ref long!',
  urlInvalid: 'url!',
};

describe('the Send Money schema', () => {
  const schema = buildSendMoneySchema(sendMessages);
  const valid: SendMoneyFormValues = {
    ...EMPTY_SEND_MONEY_VALUES,
    recipient_user_id: 'u1',
    account_id: 'HOST:1',
    amount: '15000',
    reason: 'October salary',
  };

  it('accepts a complete payment', () => {
    expect(issuesOf(schema, valid)).toEqual({});
  });

  it('refuses a missing recipient, account, reason and amount, each by field', () => {
    const issues = issuesOf(schema, { ...EMPTY_SEND_MONEY_VALUES });
    expect(issues).toMatchObject({
      recipient_user_id: 'recipient!',
      account_id: 'account!',
      amount: 'amount!',
      reason: 'reason!',
    });
  });

  it.each([
    ['zero', '0', 'amount!'],
    ['below 1', '0.5', 'amount!'],
    ['negative', '-10', 'amount!'],
    ['not a number', 'abc', 'amount!'],
    ['three decimals', '10.123', 'precision!'],
  ])('refuses an amount of %s', (_label, amount, message) => {
    expect(issuesOf(schema, { ...valid, amount }).amount).toBe(message);
  });

  it('refuses over-long reason, notes and reference', () => {
    expect(issuesOf(schema, { ...valid, reason: 'x'.repeat(301) }).reason).toBe('reason long!');
    expect(issuesOf(schema, { ...valid, notes: 'x'.repeat(1001) }).notes).toBe('notes long!');
    expect(issuesOf(schema, { ...valid, supporting_reference: 'x'.repeat(121) }).supporting_reference).toBe('ref long!');
  });

  it('accepts an empty or a full supporting link and refuses anything else', () => {
    expect(issuesOf(schema, { ...valid, supporting_url: '' })).toEqual({});
    expect(issuesOf(schema, { ...valid, supporting_url: 'https://files.example.com/slip.pdf' })).toEqual({});
    expect(issuesOf(schema, { ...valid, supporting_url: 'not a link' }).supporting_url).toBe('url!');
  });

  it('refuses an unknown category and an unknown bank method', () => {
    expect(issuesOf(schema, { ...valid, category: 'BONUS' }).category).toBe('category!');
    expect(issuesOf(schema, { ...valid, payout_method: 'RTGS' }).payout_method).toBeDefined();
  });

  it('builds the mutation input, blanking optional fields and carrying the request id', () => {
    expect(toSendMoneyInput({ ...valid, amount: '15000.50', notes: 'late', category: 'REFUND' }, 'req-1')).toEqual({
      request_id: 'req-1',
      recipient_user_id: 'u1',
      account_id: 'HOST:1',
      payout_method: 'IMPS',
      amount: 15000.5,
      category: 'REFUND',
      reason: 'October salary',
      notes: 'late',
      supporting_reference: null,
      supporting_url: null,
    });
  });
});
