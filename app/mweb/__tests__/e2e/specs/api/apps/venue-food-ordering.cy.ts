/// <reference types="cypress" />
import { expectRefused, signInRunMember } from '../../../support/access-steps';
import { expectAnswer, refusal } from '../../../support/api-apps';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue food ordering — the guest side is public on purpose (a QR scan, no
 * account), so what keeps an order the guest's is its id and access key, and
 * what keeps a bad checkout from writing anything is the order of the checks.
 * Scenario map: Apps › Venue food ordering ("Order page opened without or with
 * a wrong access key", "Ordering closed or venue Razorpay account missing").
 *
 * venueFoodOrder.service.ts: `read` answers null for an id no order has (the
 * page shows its 404); `place` checks the checkout attempt key, then the venue,
 * before it prices or writes anything; `verify` loads the order before it
 * looks at a signature. The guest pages (invoice, feedback) load the order the
 * same way (venueFoodOrder.guest.ts guestOrder), so an id no order has is
 * "Order not found" there too. No order is ever placed by this spec.
 */

const ORDER_NOT_FOUND = refusal('NOT_FOUND', 'Order not found');

const ORDER = `query E2eFoodOrder($id: ID!, $key: String) { venueFoodOrder(order_id: $id, access_key: $key) { id } }`;
const PLACE = `mutation E2ePlaceFoodOrder($input: PlaceVenueFoodOrderInput!) {
  placeVenueFoodOrder(input: $input) { access_key }
}`;
const VERIFY = `mutation E2eVerifyFoodOrder($input: VerifyVenueFoodOrderInput!) {
  verifyVenueFoodOrderPayment(input: $input) { id }
}`;
const INVOICE = `query E2eFoodInvoice($id: ID!, $key: String) { venueFoodOrderInvoicePdfBase64(order_id: $id, access_key: $key) }`;
const FEEDBACK = `mutation E2eFoodFeedback($input: SubmitVenueFoodFeedbackInput!) {
  submitVenueFoodFeedback(input: $input) { id }
}`;

/** A well-formed checkout for a venue no venue is: every field passes until the venue is looked up. */
const checkout = (overrides: Record<string, unknown> = {}) => ({
  venue_id: NO_ID,
  items: [{ item_id: NO_ID, quantity: 1 }],
  customer_name: 'E2E Guest',
  customer_phone: runAccount().phone.slice(-10),
  client_key: `e2e-${runAccount().stamp}-food-attempt`,
  ...overrides,
});

describe('API · A food order is reachable only by its own link', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('VF-01 an order id no order has reads as nothing, for a guest and for a member alike', () => {
    cy.gqlRaw(ORDER, { id: NO_ID, key: 'not-the-key' }, { token: null }).then((body) =>
      expectAnswer('venueFoodOrder', body, null),
    );
    cy.gqlRaw(ORDER, { id: NO_ID }, { token: memberToken }).then((body) => expectAnswer('venueFoodOrder', body, null));
    cy.gqlRaw(ORDER, { id: 'not-an-order' }, { token: null }).then((body) => expectAnswer('venueFoodOrder', body, null));
  });

  it('VF-02 a checkout without a valid attempt key is refused before anything else is read', () => {
    const expired = refusal('BAD_USER_INPUT', 'Your order session has expired — refresh the page');
    cy.gqlRaw(PLACE, { input: checkout({ client_key: 'short' }) }, { token: null }).then((body) =>
      expectRefused('placeVenueFoodOrder', body, expired),
    );
  });

  it('VF-03 ordering from a venue that does not exist is refused without placing anything', () => {
    cy.gqlRaw(PLACE, { input: checkout() }, { token: null }).then((body) =>
      expectRefused('placeVenueFoodOrder', body, refusal('NOT_FOUND', 'Venue not found')),
    );
    cy.gqlRaw(PLACE, { input: checkout({ venue_id: 'not-a-venue' }) }, { token: null }).then((body) =>
      expectRefused('placeVenueFoodOrder', body, refusal('BAD_USER_INPUT', 'Invalid venue id')),
    );
  });

  it('VF-04 a payment cannot be verified against an order that is not there', () => {
    const input = {
      order_id: NO_ID,
      razorpay_order_id: 'order_e2e',
      razorpay_payment_id: 'pay_e2e',
      razorpay_signature: 'not-a-signature',
    };
    cy.gqlRaw(VERIFY, { input }, { token: null }).then((body) =>
      expectRefused('verifyVenueFoodOrderPayment', body, ORDER_NOT_FOUND),
    );
  });

  it('VF-05 the invoice and the rating of an order that is not there are refused', () => {
    cy.gqlRaw(INVOICE, { id: NO_ID, key: 'not-the-key' }, { token: null }).then((body) =>
      expectRefused('venueFoodOrderInvoicePdfBase64', body, ORDER_NOT_FOUND),
    );
    cy.gqlRaw(FEEDBACK, { input: { order_id: NO_ID, rating: 5 } }, { token: memberToken }).then((body) =>
      expectRefused('submitVenueFoodFeedback', body, ORDER_NOT_FOUND),
    );
  });
});
