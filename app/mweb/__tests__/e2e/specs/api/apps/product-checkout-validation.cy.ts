/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectInvalid } from '../../../support/api-apps';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Product checkout & payment — the checks a product order must pass before any
 * gateway order, coupon, coin or stock is touched. Scenario map: Apps › Product
 * checkout & payment ("Checkout form validation", "Enter a delivery address
 * manually", "Delivery-charge pay gate and round-off").
 *
 * payment.resolver.ts validates createRazorpayProductOrder,
 * dummyProductCheckout and productShippingQuote against their schemas
 * (payment.validator.ts) before checkout eligibility, before any product is
 * priced and long before Razorpay is asked for an order; every input below
 * fails that schema, so no payment row, order or coin redemption is ever
 * written and nothing is charged.
 */

const QUOTE = `query E2eShippingQuote($input: ProductShippingQuoteInput!) { productShippingQuote(input: $input) { total } }`;
const RAZORPAY = `mutation E2eProductOrder($input: ProductCheckoutInput!) {
  createRazorpayProductOrder(input: $input) { payment_doc_id }
}`;
const DUMMY = `mutation E2eDummyProductCheckout($input: DummyProductCheckoutInput!) { dummyProductCheckout(input: $input) { id } }`;

/** One cart line naming nothing that exists — the schema never lets it reach a lookup here. */
const LINE = { product_id: NO_ID, pod_id: NO_ID, quantity: 1 };

describe('API · Product checkout refuses an incomplete order before any payment exists', { testIsolation: false }, () => {
  const account = runAccount();
  let token = '';

  /** Everything a valid checkout carries, so each scenario breaks exactly one rule. */
  const order = (overrides: Record<string, unknown> = {}) => ({
    items: [LINE],
    contact_name: 'E2E Shopper',
    contact_email: account.email,
    contact_phone_extension: '',
    contact_phone_number: '',
    checkout_url: 'https://example.com/product-checkout',
    billing: { line1: '12 Test Street', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    delivery_pincode: '560001',
    ...overrides,
  });
  /** The same order with no billing details at all, structured or one-line. */
  const withoutBilling = (): Record<string, unknown> => {
    const input: Record<string, unknown> = order();
    delete input.billing;
    return input;
  };

  before(() => {
    signInRunMember().then((member) => {
      token = member;
    });
  });

  it('PCV-01 a signed-out caller can neither price delivery nor start a checkout', () => {
    cy.gqlRaw(QUOTE, { input: { items: [LINE], delivery_pincode: '560001' } }, { token: null }).then((body) =>
      expectRefused('productShippingQuote', body, SIGNED_OUT),
    );
    cy.gqlRaw(RAZORPAY, { input: order() }, { token: null }).then((body) =>
      expectRefused('createRazorpayProductOrder', body, SIGNED_OUT),
    );
  });

  it('PCV-02 delivery is never priced for an empty cart or a pincode that is not one', () => {
    cy.gqlRaw(QUOTE, { input: { items: [], delivery_pincode: '560001' } }, { token }).then((body) =>
      expectInvalid('productShippingQuote', body, ['Your cart is empty']),
    );
    cy.gqlRaw(QUOTE, { input: { items: [LINE], delivery_pincode: '12ab' } }, { token }).then((body) =>
      expectInvalid('productShippingQuote', body, ['Enter a valid pincode']),
    );
    cy.gqlRaw(QUOTE, { input: { items: [LINE], delivery_pincode: '' } }, { token }).then((body) =>
      expectInvalid('productShippingQuote', body, ['Delivery pincode is required']),
    );
  });

  it('PCV-03 an empty cart, a blank email or a bad pincode stops the checkout', () => {
    cy.gqlRaw(RAZORPAY, { input: order({ items: [] }) }, { token }).then((body) =>
      expectInvalid('createRazorpayProductOrder', body, ['Your cart is empty']),
    );
    cy.gqlRaw(RAZORPAY, { input: order({ contact_email: '' }) }, { token }).then((body) =>
      expectInvalid('createRazorpayProductOrder', body, ['Email is required']),
    );
    cy.gqlRaw(RAZORPAY, { input: order({ delivery_pincode: '12ab' }) }, { token }).then((body) =>
      expectInvalid('createRazorpayProductOrder', body, ['Enter a valid pincode']),
    );
  });

  it('PCV-04 the billing details are checked: an address, a city and state, a real email and a 15-character GSTIN', () => {
    const noBilling = withoutBilling();
    cy.gqlRaw(RAZORPAY, { input: noBilling }, { token }).then((body) =>
      expectInvalid('createRazorpayProductOrder', body, ['A billing address is required']),
    );
    const blank = { line1: '', city: '', state: '', pincode: '560001' };
    cy.gqlRaw(RAZORPAY, { input: order({ billing: blank }) }, { token }).then((body) =>
      expectInvalid('createRazorpayProductOrder', body, ['Address line 1 is required', 'City is required', 'State is required']),
    );
    const billing = { line1: '12 Test Street', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', email: 'abc', gstin: '29ABCDE123' };
    cy.gqlRaw(RAZORPAY, { input: order({ billing }) }, { token }).then((body) =>
      expectInvalid('createRazorpayProductOrder', body, ['Enter a valid billing email', 'Enter a valid 15-character GSTIN']),
    );
  });

  it('PCV-05 the dummy gateway applies the same rules before it simulates anything', () => {
    cy.gqlRaw(DUMMY, { input: { ...order({ items: [] }), simulate_failure: false } }, { token }).then((body) =>
      expectInvalid('dummyProductCheckout', body, ['Your cart is empty']),
    );
    const noBilling = withoutBilling();
    cy.gqlRaw(DUMMY, { input: { ...noBilling, simulate_failure: false } }, { token }).then((body) =>
      expectInvalid('dummyProductCheckout', body, ['A billing address is required']),
    );
  });
});
