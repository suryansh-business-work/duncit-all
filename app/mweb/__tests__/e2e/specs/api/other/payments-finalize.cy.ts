/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { firstError } from '../../../support/api-other';
import { NO_ID } from '../../../support/staff-operations';

/**
 * verifyRazorpayPayment refuses before anything is finalized. The order of its
 * gates (server/src/modules/finance/payment):
 *
 *   payment.resolver.ts   requireAuth, then verifyRazorpaySchema (payment.validator.ts)
 *   payment.service.ts    verifyRazorpayCheckout: the payment must exist, then be
 *                         the caller's ("Not your payment"), then match the order
 *                         ("Payment/order mismatch") before any signature is checked
 *
 * No payment the run account could own exists, so the owner/mismatch/signature
 * gates need a fixture payment (see the run report). Scenario map: Other ›
 * Payments finalize. Research said a bad signature marks the payment FAILED and
 * strands a real capture; the code no longer does — verifyRazorpayAndSettle
 * leaves it PENDING for the reconciler (payment.service.ts:855-876).
 */

const VERIFY = `mutation E2eVerifyRazorpay($input: VerifyRazorpayInput!) {
  verifyRazorpayPayment(input: $input) { __typename }
}`;

const input = (overrides: Record<string, string> = {}) => ({
  input: {
    payment_doc_id: NO_ID,
    razorpay_order_id: 'order_e2e',
    razorpay_payment_id: 'pay_e2e',
    razorpay_signature: 'e2e-not-a-signature',
    ...overrides,
  },
});

describe('API · verifyRazorpayPayment refuses before finalizing anything', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('PF-01 a signed-out caller is refused', () => {
    cy.gqlRaw(VERIFY, input(), { token: null }).then((body) =>
      expectRefused('verifyRazorpayPayment', body, SIGNED_OUT),
    );
  });

  it('PF-02 blank gateway fields fail validation, each named', () => {
    cy.gqlRaw(
      VERIFY,
      input({ razorpay_order_id: ' ', razorpay_payment_id: '', razorpay_signature: '' }),
      { token: memberToken },
    ).then((body) => {
      const error = firstError(body, 'blank gateway fields');
      expect(error.code).to.equal('BAD_USER_INPUT');
      expect(error.message).to.equal('Validation failed');
      expect(error.errors).to.include.members(['Order id is required', 'Payment id is required', 'Signature is required']);
      expect(body.data?.verifyRazorpayPayment ?? null).to.be.null;
    });
  });

  it('PF-03 a payment that does not exist is NOT_FOUND, never settled', () => {
    cy.gqlRaw(VERIFY, input(), { token: memberToken }).then((body) => {
      const error = firstError(body, 'an unknown payment');
      expect(error.code).to.equal('NOT_FOUND');
      expect(error.message).to.equal('Payment not found');
      expect(body.data?.verifyRazorpayPayment ?? null).to.be.null;
    });
  });
});
