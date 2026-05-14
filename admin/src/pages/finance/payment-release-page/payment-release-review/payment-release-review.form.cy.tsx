import { describe, expect, it } from 'vitest';
import { paymentReleaseReviewSchema, toReviewInput } from './payment-release-review.form';

describe('paymentReleaseReviewSchema', () => {
  it('requires reason for partial release', async () => {
    const error = await paymentReleaseReviewSchema(1000)
      .validate({ status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 500, approval_reason: '' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/reason/i);
  });

  it('maps full release to requested amount', () => {
    const input = toReviewInput({ status: 'APPROVED', approval_type: 'FULL', approved_amount: 1, approval_reason: '' }, 900);
    expect(input.approved_amount).toBe(900);
  });
});