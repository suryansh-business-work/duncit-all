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
