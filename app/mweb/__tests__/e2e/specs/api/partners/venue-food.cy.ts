/// <reference types="cypress" />
import { signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue food — the order board, the stats and the coupons of a venue belong to
 * its owner (venues/venueFood: every staff-side call starts at `managedVenue`,
 * which refuses another owner's venue unless the caller holds a Venues console
 * role). Orders themselves are public to whoever holds the order's access key
 * or placed it (`assertOrderAccess`). Scenario map: Partners › Venue food
 * ("Owner cannot read or act on another venue's food data", "… food coupons",
 * "… food orders", "Food order and invoice need the access key").
 */

const ORDERS = `query E2eFoodOrders($venue_id: ID!) { venueFoodOrdersTable(venue_id: $venue_id) { total } }`;
const COUPONS = `query E2eFoodCoupons($venue_id: ID!) { venueFoodCouponsTable(venue_id: $venue_id) { total } }`;
const STATS = `query E2eFoodStats($venue_id: ID!) { venueFoodStats(venue_id: $venue_id) { days } }`;
const CREATE_COUPON = `mutation E2eCreateFoodCoupon($input: CreateVenueFoodCouponInput!) {
  createVenueFoodCoupon(input: $input) { id }
}`;
const COUPON_ACTIVE = `mutation E2eFoodCouponActive($id: ID!) {
  setVenueFoodCouponActive(coupon_id: $id, is_active: false) { id }
}`;
const DELETE_COUPON = `mutation E2eDeleteFoodCoupon($id: ID!) { deleteVenueFoodCoupon(coupon_id: $id) }`;
const ORDER_STATUS = `mutation E2eFoodOrderStatus($id: ID!) { setVenueFoodOrderStatus(order_id: $id, status: SERVED) { id } }`;
const CANCEL_ORDER = `mutation E2eCancelFoodOrder($id: ID!) { cancelVenueFoodOrder(order_id: $id, reason: "e2e check") { id } }`;
const ORDER = `query E2eFoodOrder($id: ID!, $key: String) { venueFoodOrder(order_id: $id, access_key: $key) { id } }`;
const INVOICE = `query E2eFoodInvoice($id: ID!, $key: String) { venueFoodOrderInvoicePdfBase64(order_id: $id, access_key: $key) }`;

const NOT_YOUR_VENUE: Refusal = { code: 'FORBIDDEN', message: 'Not your venue' };
const ORDER_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Order not found' };
const COUPON_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Coupon not found' };

describe('API · A venue’s food board and coupons are its owner’s alone', { testIsolation: false }, () => {
  let memberToken = '';
  let foreignId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    foreignVenueId().then((id) => {
      foreignId = id;
    });
  });

  it('VF-01 another owner’s order board, coupons and food stats are refused', () => {
    [
      ['venueFoodOrdersTable', ORDERS],
      ['venueFoodCouponsTable', COUPONS],
      ['venueFoodStats', STATS],
    ].forEach(([field, query]) => {
      expectEachRefused(field, query, { venue_id: foreignId }, [
        [null, SIGNED_OUT],
        [memberToken, NOT_YOUR_VENUE],
      ]);
    });
  });

  it('VF-02 a coupon cannot be created at another owner’s venue', () => {
    // An invalid code and a zero discount: a broken ownership check would still end in a validation error.
    const input = { venue_id: foreignId, code: 'x', discount_pct: 0 };
    expectEachRefused('createVenueFoodCoupon', CREATE_COUPON, { input }, [
      [null, SIGNED_OUT],
      [memberToken, NOT_YOUR_VENUE],
    ]);
  });

  it('VF-03 a coupon that is not the caller’s cannot be switched off or deleted', () => {
    expectEachRefused('setVenueFoodCouponActive', COUPON_ACTIVE, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, COUPON_NOT_FOUND],
    ]);
    expectEachRefused('deleteVenueFoodCoupon', DELETE_COUPON, { id: NO_ID }, [[memberToken, COUPON_NOT_FOUND]]);
  });

  it('VF-04 an order that is not the caller’s cannot be moved on or cancelled', () => {
    expectEachRefused('setVenueFoodOrderStatus', ORDER_STATUS, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, ORDER_NOT_FOUND],
    ]);
    expectEachRefused('cancelVenueFoodOrder', CANCEL_ORDER, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, ORDER_NOT_FOUND],
    ]);
  });

  it('VF-05 an order and its invoice reveal nothing without the order’s key', () => {
    [null, memberToken].forEach((token) => {
      cy.gqlRaw(ORDER, { id: NO_ID, key: 'not-the-key' }, { token }).then((body) =>
        expectAnswer('venueFoodOrder', body, null),
      );
    });
    expectEachRefused('venueFoodOrderInvoicePdfBase64', INVOICE, { id: NO_ID, key: 'not-the-key' }, [
      [null, ORDER_NOT_FOUND],
      [memberToken, ORDER_NOT_FOUND],
    ]);
  });
});
