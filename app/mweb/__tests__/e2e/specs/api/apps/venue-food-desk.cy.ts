/// <reference types="cypress" />
import { expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { foreignVenueId, memberId, refusal } from '../../../support/api-apps';
import { asRole } from '../../../support/api-staff';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue food desk — the order board, the food stats and the food coupons of a
 * venue are its owner's, and the venues console's. Scenario map: Apps › Venue
 * food desk ("Owner cannot read or act on another venue's food orders", "Owner
 * cannot manage another venue's food coupons", "Venues-console editor can act
 * on any venue's food board").
 *
 * Every owner operation passes through venueFoodOrder.shared.ts managedVenue
 * (orders and coupons load their venue first): a venue that exists but is not
 * the caller's is "Not your venue" unless the caller holds a venues-console
 * editor role (console-access.ts consoleEditors('VENUE')); an id no venue,
 * order or coupon has is its own not-found. The staff read selects counts
 * only — never a guest's name or number.
 */

const NOT_YOUR_VENUE = refusal('FORBIDDEN', 'Not your venue');

const BOARD = `query E2eFoodBoard($venue: ID!) { venueFoodOrdersTable(venue_id: $venue) { total } }`;
const STATS = `query E2eFoodStats($venue: ID!) { venueFoodStats(venue_id: $venue, days: 30) { orders } }`;
const COUPONS = `query E2eFoodCoupons($venue: ID!) { venueFoodCouponsTable(venue_id: $venue) { total } }`;
const MOVE = `mutation E2eMoveFoodOrder($id: ID!) { setVenueFoodOrderStatus(order_id: $id, status: SERVED) { id } }`;
const CANCEL = `mutation E2eCancelFoodOrder($id: ID!) { cancelVenueFoodOrder(order_id: $id, reason: "E2E check") { id } }`;
const COUPON_ACTIVE = `mutation E2eFoodCouponActive($id: ID!) { setVenueFoodCouponActive(coupon_id: $id, is_active: false) { __typename } }`;
const COUPON_DELETE = `mutation E2eFoodCouponDelete($id: ID!) { deleteVenueFoodCoupon(coupon_id: $id) }`;

const OWNER_READS = [
  { field: 'venueFoodOrdersTable', query: BOARD },
  { field: 'venueFoodStats', query: STATS },
  { field: 'venueFoodCouponsTable', query: COUPONS },
] as const;

describe("API · A venue's food desk is its owner's", { testIsolation: false }, () => {
  let memberToken = '';
  let venueId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignVenueId(token, id).then((venue) => {
          venueId = venue;
        }),
      );
    });
  });

  after(() => {
    revokeRunRoles(['SUPPORT_USER', 'ALL_VENUES_ACCESS']);
  });

  it("FD-01 the board, stats and coupons of another owner's venue are refused, and nothing signed out", () => {
    OWNER_READS.forEach(({ field, query }) => {
      cy.gqlRaw(query, { venue: venueId }, { token: null }).then((body) => expectRefused(field, body, SIGNED_OUT));
      cy.gqlRaw(query, { venue: venueId }, { token: memberToken }).then((body) =>
        expectRefused(field, body, NOT_YOUR_VENUE),
      );
    });
  });

  it('FD-02 a venue id no venue has answers "Venue not found"', () => {
    cy.gqlRaw(BOARD, { venue: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('venueFoodOrdersTable', body, refusal('NOT_FOUND', 'Venue not found')),
    );
  });

  it('FD-03 an order that is not on the member’s board can be neither moved nor cancelled', () => {
    cy.gqlRaw(MOVE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('setVenueFoodOrderStatus', body, refusal('NOT_FOUND', 'Order not found')),
    );
    cy.gqlRaw(CANCEL, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('cancelVenueFoodOrder', body, refusal('NOT_FOUND', 'Order not found')),
    );
  });

  it('FD-04 a coupon that is not the member’s venue’s can be neither switched off nor deleted', () => {
    cy.gqlRaw(COUPON_ACTIVE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('setVenueFoodCouponActive', body, refusal('NOT_FOUND', 'Coupon not found')),
    );
    cy.gqlRaw(COUPON_DELETE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('deleteVenueFoodCoupon', body, refusal('NOT_FOUND', 'Coupon not found')),
    );
  });

  it('FD-05 a staff seat outside the venues console is refused like any member', () => {
    asRole('SUPPORT_USER', (token) => {
      cy.gqlRaw(BOARD, { venue: venueId }, { token }).then((body) =>
        expectRefused('venueFoodOrdersTable', body, NOT_YOUR_VENUE),
      );
    });
  });

  it("FD-06 the venues console reads any venue's board and stats", () => {
    asRole('ALL_VENUES_ACCESS', (token) => {
      cy.gql<{ venueFoodOrdersTable: { total: number } }>(BOARD, { venue: venueId }, { token }).then((data) => {
        expect(data.venueFoodOrdersTable.total).to.be.a('number').and.be.at.least(0);
      });
      cy.gql<{ venueFoodStats: { orders: number } }>(STATS, { venue: venueId }, { token }).then((data) => {
        expect(data.venueFoodStats.orders).to.be.a('number').and.be.at.least(0);
      });
    });
  });
});
