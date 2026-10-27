import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, expectRefused, restoreStaffRoles, staffAccount } from '../../support/ui-staff';
import { consoleLogin, grantConsoleRoles, pickTab, rawAs } from '../../support/ui-directories';

/**
 * Venues console › Venue food (admin): the food tabs of a venue record
 * (portals/venues/src/VenueRecordPage.tsx over @duncit/venue-food), as
 * ALL_VENUES_ACCESS sees them.
 *
 * Every venue here is a real partner's, and its menu, coupons and orders are
 * live — guests order and pay against them. So nothing is saved: the tabs, the
 * reads, the validation that stops a save before it is sent, and the server's
 * refusal of a refund to the console role, asked on an order that could not be
 * cancelled anyway (served or already cancelled).
 */

const ROLES = ['ALL_VENUES_ACCESS'] as const;
const MENU = 'venues-venue-food-menu';
const FOOD_TABS = ['foodDashboard', 'foodOrders', 'foodCoupons'] as const;

const APPROVED_VENUES = `query E2eApprovedVenues { venues(status: APPROVED) { id offers_food } }`;

const FOOD_ORDERS = `query E2eFoodOrders($venue_id: ID!, $query: TableQueryInput) {
  venueFoodOrdersTable(venue_id: $venue_id, query: $query) { rows { id status payment_status } }
}`;

const CANCEL_ORDER = `mutation E2eCancelFoodOrder($order_id: ID!, $reason: String!) {
  cancelVenueFoodOrder(order_id: $order_id, reason: $reason) { id }
}`;

interface ApprovedVenue {
  id: string;
  offers_food: boolean;
}

/** Approved venues on staging, split by whether they serve food. */
function approvedVenues(): Cypress.Chainable<{ food: string[]; noFood: string[] }> {
  return cy.gql<{ venues: ApprovedVenue[] }>(APPROVED_VENUES).then(({ venues }) => {
    const food = venues.filter((v) => v.offers_food).map((v) => v.id);
    const noFood = venues.filter((v) => !v.offers_food).map((v) => v.id);
    expect(food, 'staging has an approved venue that serves food').to.have.length.greaterThan(0);
    expect(noFood, 'staging has an approved venue that does not serve food').to.have.length.greaterThan(0);
    return { food, noFood };
  });
}

/**
 * The first order, across the food venues, that can no longer be cancelled —
 * so even a wrongly-admitted cancel would refund nothing.
 */
function settledOrder(venueIds: readonly string[]): Cypress.Chainable<string> {
  const [venueId, ...rest] = venueIds;
  if (!venueId) throw new Error('No served or cancelled food order exists on staging to ask the refund gate about.');
  return cy
    .gql<{ venueFoodOrdersTable: { rows: { id: string; status: string }[] } }>(FOOD_ORDERS, {
      venue_id: venueId,
      query: { page: 1, page_size: 50 },
    })
    .then(({ venueFoodOrdersTable }) => {
      const done = venueFoodOrdersTable.rows.find((row) => row.status === 'SERVED' || row.status === 'CANCELLED');
      return done ? cy.wrap(done.id, { log: false }) : settledOrder(rest);
    });
}

describe('Venues console · Venue food (admin) (run account, password CHANGED)', () => {
  let account: RunAccount;
  let token = '';
  let venues: { food: string[]; noFood: string[] };

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
    consoleLogin('venues', account);
    approvedVenues().then((found) => {
      venues = found;
    });
  });

  beforeEach(() => {
    consoleLogin('venues', account).then((t) => {
      token = t;
    });
  });

  after(() => {
    if (account) restoreStaffRoles(account, ROLES);
  });

  it('VF-01 Food Menu is a tab of every venue; Dashboard, Orders and Coupons appear only for a venue that serves food, each held in the URL', () => {
    cy.visitPortal('venues', `/venues/${venues.noFood[0]}`);
    cy.byTestId('venue-tab-foodMenu').should('exist');
    for (const tab of FOOD_TABS) cy.byTestId(`venue-tab-${tab}`).should('not.exist');

    cy.visitPortal('venues', `/venues/${venues.food[0]}`);
    cy.byTestId('venue-tab-foodMenu').should('exist');
    cy.interceptOperation('VenueFoodStats');
    pickTab('venue', 'foodDashboard');
    cy.wait('@VenueFoodStats').its('response.body.errors').should('be.undefined');
    cy.byTestId('food-dashboard-error').should('not.exist');
    pickTab('venue', 'foodOrders');
    pickTab('venue', 'foodCoupons');
    cy.reload();
    cy.byTestId('venue-tab-foodCoupons').should('have.attr', 'aria-selected', 'true');
  });

  it('VF-02 the Food Menu tab edits in admin mode: the account is a status only, the GSTIN is editable, and a bad GSTIN blocks the save', () => {
    cy.interceptOperation('AdminVenueFoodMenu');
    cy.visitPortal('venues', `/venues/${venues.food[0]}?selectedtab=foodMenu`);
    cy.wait('@AdminVenueFoodMenu').its('response.body.data.venue.id').should('eq', venues.food[0]);
    cy.byTestId(`${MENU}-form`).should('be.visible');
    cy.byTestId(`${MENU}-food-account-status`).should('be.visible');
    cy.byTestId(`${MENU}-food-razorpay`).should('not.exist');
    cy.byTestId(`${MENU}-food-gstin-locked`).should('not.exist');

    const saves = countOperation('UpdateVenueFoodMenu');
    cy.byTestId(`${MENU}-food-gstin`).find('input').clear().type('BAD', { delay: 0 });
    cy.byTestId(`${MENU}-save`).click();
    cy.byTestId(`${MENU}-food-gstin`).should('contain.text', 'Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5.');
    expectNotSent(saves, 'UpdateVenueFoodMenu');
  });

  it('VF-03 the order board loads for the console role, and the server refuses it the refund', () => {
    cy.interceptOperation('VenueFoodOrdersTable');
    cy.visitPortal('venues', `/venues/${venues.food[0]}?selectedtab=foodOrders`);
    cy.wait('@VenueFoodOrdersTable').its('response.body.errors').should('be.undefined');
    settledOrder(venues.food).then((orderId) => {
      rawAs('venues', CANCEL_ORDER, { order_id: orderId, reason: 'E2E refund gate check' }, token).then((body) =>
        expectRefused(body, 'cancelVenueFoodOrder', 'Not your venue'),
      );
    });
  });

  it('VF-04 Food Coupons lists the venue’s coupons, and a new coupon with no code or discount is stopped before it is sent', () => {
    cy.interceptOperation('VenueFoodCouponsTable');
    cy.visitPortal('venues', `/venues/${venues.food[0]}?selectedtab=foodCoupons`);
    cy.wait('@VenueFoodCouponsTable').then(({ request, response }) => {
      expect(request.body.variables.venue_id).to.eq(venues.food[0]);
      expect(response?.body.errors).to.be.undefined;
    });
    const creates = countOperation('CreateVenueFoodCoupon');
    cy.byTestId('food-coupon-new').click();
    cy.byTestId('food-coupon-form').should('be.visible');
    cy.byTestId('food-coupon-save').click();
    cy.byTestId('food-coupon-code').should('contain.text', 'Enter a coupon code');
    cy.byTestId('food-coupon-discount').should('contain.text', 'Enter a whole number from 1 to');
    expectNotSent(creates, 'CreateVenueFoodCoupon');
    cy.byTestId('food-coupon-cancel').click();
    cy.byTestId('food-coupon-form').should('not.exist');
  });
});
