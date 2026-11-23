import { describe, expect, it } from 'vitest';
import { paymentReleaseReviewSchema, toReviewInput } from './payment-release-review.form';

const messages = (result: ReturnType<ReturnType<typeof paymentReleaseReviewSchema>['safeParse']>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('paymentReleaseReviewSchema', () => {
  it('requires reason for partial release', () => {
    const result = paymentReleaseReviewSchema(1000).safeParse({
      status: 'APPROVED',
      approval_type: 'PARTIAL',
      approved_amount: 500,
      approval_reason: '',
    });
    expect(messages(result)).toMatch(/reason/i);
  });

  it('requires reason for rejection', () => {
    const result = paymentReleaseReviewSchema(1000).safeParse({
      status: 'REJECTED',
      approval_type: 'FULL',
      approved_amount: 0,
      approval_reason: '',
    });
    expect(messages(result)).toMatch(/reason/i);
  });

  it('rejects an amount above the requested amount', () => {
    const result = paymentReleaseReviewSchema(1000).safeParse({
      status: 'APPROVED',
      approval_type: 'PARTIAL',
      approved_amount: 1500,
      approval_reason: 'partial payout',
    });
    expect(messages(result)).toMatch(/exceed requested amount/i);
  });

  it('accepts a valid partial release with a reason', () => {
    const result = paymentReleaseReviewSchema(1000).safeParse({
      status: 'APPROVED',
      approval_type: 'PARTIAL',
      approved_amount: 500,
      approval_reason: 'partial payout',
    });
    expect(result.success).toBe(true);
  });

  it('maps full release to requested amount', () => {
    const input = toReviewInput({ status: 'APPROVED', approval_type: 'FULL', approved_amount: 1, approval_reason: '' }, 900);
    expect(input.approved_amount).toBe(900);
  });
});

// A payout of a completion that sends out more than its pod collected (the
// venue paid in full while the host's side went below zero): the server
// refuses to approve it without a note saying who funds the difference.
describe('paymentReleaseReviewSchema with a funding shortfall', () => {
  const TOO_SHORT = 'Say who funds the shortfall in at least 10 characters.';
  const approval = { status: 'APPROVED', approval_type: 'FULL', approved_amount: 40, approval_reason: '' } as const;
  const withShortfall = () => paymentReleaseReviewSchema(40, undefined, 15.89);

  it('requires a funding note of at least 10 characters, counted after trimming, to approve it', () => {
    expect(messages(withShortfall().safeParse(approval))).toBe(TOO_SHORT);
    expect(messages(withShortfall().safeParse({ ...approval, shortfall_funding_note: '  123456789  ' }))).toBe(TOO_SHORT);
    const parsed = withShortfall().safeParse({ ...approval, shortfall_funding_note: '  Duncit ops budget  ' });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.shortfall_funding_note).toBe('Duncit ops budget');
  });

  it('asks no funding note to reject such a payout, or to approve one the pod covered', () => {
    const rejection = { status: 'REJECTED', approval_type: 'FULL', approved_amount: 0, approval_reason: 'Bill does not match' };
    expect(withShortfall().safeParse(rejection).success).toBe(true);
    expect(paymentReleaseReviewSchema(40).safeParse(approval).success).toBe(true);
  });

  it('refuses a funding note longer than a release stores', () => {
    expect(messages(withShortfall().safeParse({ ...approval, shortfall_funding_note: 'a'.repeat(2001) }))).toBe(
      'Keep the funding note to 2000 characters or fewer.',
    );
  });
});

describe('toReviewInput funding note', () => {
  const approval = {
    status: 'APPROVED',
    approval_type: 'FULL',
    approved_amount: 40,
    approval_reason: '',
    shortfall_funding_note: 'Duncit ops budget',
  } as const;

  it('sends the funding note with an approval', () => {
    expect(toReviewInput(approval, 40)).toEqual({
      status: 'APPROVED',
      approval_type: 'FULL',
      approved_amount: 40,
      shortfall_funding_note: 'Duncit ops budget',
    });
  });

  it('never sends one with a rejection, nor an empty one', () => {
    expect(toReviewInput({ ...approval, status: 'REJECTED', approval_reason: 'no' }, 40).shortfall_funding_note).toBeUndefined();
    expect(toReviewInput({ ...approval, shortfall_funding_note: '' }, 40).shortfall_funding_note).toBeUndefined();
  });
});
