/// <reference types="cypress" />
import { revokeRunRoles, signInRunAs } from '../../../support/access-steps';
import { expectEachRefused, expectPage, foreignVenueId } from '../../../support/api-partners';

/**
 * Venue food (admin) — the Venues console reads any venue's food board: the
 * food resolvers (venues/venueFood/venueFood.resolver.ts `operator`) treat a
 * holder of `consoleEditors('VENUE')` as an admin and everyone else as an
 * owner, who must own the venue. So staff of ANOTHER console get exactly the
 * owner's refusal. Only reads are made; nothing is cancelled.
 * Scenario map: Partners › Venue food (admin).
 */

const ORDERS = `query E2eAdminFoodOrders($venue_id: ID!) {
  venueFoodOrdersTable(venue_id: $venue_id, query: { page_size: 1 }) { total }
}`;
const COUPONS = `query E2eAdminFoodCoupons($venue_id: ID!) {
  venueFoodCouponsTable(venue_id: $venue_id, query: { page_size: 1 }) { total }
}`;

describe('API · Venue food staff operations follow the Venues console role', { testIsolation: false }, () => {
  let podsStaffToken = '';
  let venuesStaffToken = '';
  let foreignId = '';

  before(() => {
    foreignVenueId().then((id) => {
      foreignId = id;
    });
    signInRunAs(['ALL_PODS_ACCESS']).then((token) => {
      podsStaffToken = token;
    });
    revokeRunRoles(['ALL_PODS_ACCESS']);
    signInRunAs(['ALL_VENUES_ACCESS']).then((token) => {
      venuesStaffToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_VENUES_ACCESS']);
  });

  it('VFA-01 staff without a Venues role are refused a venue’s food orders and coupons', () => {
    [
      ['venueFoodOrdersTable', ORDERS],
      ['venueFoodCouponsTable', COUPONS],
    ].forEach(([field, query]) => {
      expectEachRefused(field, query, { venue_id: foreignId }, [
        [podsStaffToken, { code: 'FORBIDDEN', message: 'Not your venue' }],
      ]);
    });
  });

  it('VFA-02 ALL_VENUES_ACCESS reads any venue’s food orders and coupons', () => {
    cy.gqlRaw(ORDERS, { venue_id: foreignId }, { token: venuesStaffToken }).then((body) =>
      expectPage('venueFoodOrdersTable', body),
    );
    cy.gqlRaw(COUPONS, { venue_id: foreignId }, { token: venuesStaffToken }).then((body) =>
      expectPage('venueFoodCouponsTable', body),
    );
  });
});
