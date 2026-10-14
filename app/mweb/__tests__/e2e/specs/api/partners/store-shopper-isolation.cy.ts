/// <reference types="cypress" />
import { signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The pet store's shopper side (ecomm.duncit.com /account, /account/orders,
 * /autoship, /wishlist …) — a shopper's orders, returns and Autoship plans are
 * read by their account, or for a guest order by its access key
 * (commerce/store: `ownedOrder` / `buyerOrder`, `ownSub`). The run account
 * has never bought from the store, so it reads nothing, and an order number no
 * order has answers "Order not found" for everyone — the same lookup that
 * then refuses a wrong account or key. Scenario map: Partners › Store account,
 * Store orders, Store autoship, Store engagement.
 */

const NO_ORDER = 'E2E-NO-SUCH-ORDER';
const MINE = [
  ['storeMyOrders', `query E2eStoreMyOrders { storeMyOrders { __typename } }`],
  ['storeMyReturns', `query E2eStoreMyReturns { storeMyReturns { __typename } }`],
  ['storeMySubscriptions', `query E2eStoreMySubs { storeMySubscriptions { __typename } }`],
] as const;
const BY_ORDER = [
  ['storeOrder', `query E2eStoreOrder($no: String!) { storeOrder(order_no: $no, access_key: "not-the-key") { __typename } }`],
  ['storeOrderReturns', `query E2eStoreOrderReturns($no: String!) { storeOrderReturns(order_no: $no, access_key: "x") { __typename } }`],
  ['storeInvoicePdf', `query E2eStoreInvoice($no: String!) { storeInvoicePdf(order_no: $no, access_key: "not-the-key") }`],
  [
    'storeCancelOrder',
    `mutation E2eStoreCancel($no: String!) { storeCancelOrder(order_no: $no, reason: "e2e", access_key: "x") { __typename } }`,
  ],
] as const;
const TRACK = `query E2eStoreTrack($no: String!) { storeTrackOrder(order_no: $no, contact: "nobody@example.com") { __typename } }`;
const SUBSCRIPTIONS = [
  ['storePauseSubscription', `mutation E2eStorePause($id: ID!) { storePauseSubscription(id: $id, paused: true) { __typename } }`],
  ['storeCancelSubscription', `mutation E2eStoreCancelSub($id: ID!) { storeCancelSubscription(id: $id) { __typename } }`],
] as const;

const ORDER_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Order not found' };

describe('API · A pet store shopper reads only their own orders, returns and plans', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('SS-01 the account pages are refused signed out and empty for a member who never shopped', () => {
    MINE.forEach(([field, query]) => {
      expectEachRefused(field, query, {}, [[null, SIGNED_OUT]]);
      cy.gqlRaw(query, {}, { token: memberToken }).then((body) => expectAnswer(field, body, []));
    });
  });

  it('SS-02 an order the caller did not place opens nothing: no order, invoice, returns or cancellation', () => {
    BY_ORDER.forEach(([field, query]) => {
      expectEachRefused(field, query, { no: NO_ORDER }, [
        [null, ORDER_NOT_FOUND],
        [memberToken, ORDER_NOT_FOUND],
      ]);
    });
  });

  it('SS-03 tracking needs the order number and the contact it was placed with', () => {
    expectEachRefused('storeTrackOrder', TRACK, { no: NO_ORDER }, [
      [null, { code: 'NOT_FOUND', message: 'We could not find an order with those details' }],
    ]);
  });

  it('SS-04 an Autoship plan that is not the shopper’s cannot be paused or cancelled', () => {
    SUBSCRIPTIONS.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [null, SIGNED_OUT],
        [memberToken, { code: 'NOT_FOUND', message: 'Subscription not found' }],
      ]);
    });
  });
});
