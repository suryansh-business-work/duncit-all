/// <reference types="cypress" />
import { partnerWorld, signInRunPartner, visitWithVenue, type PartnerWorld } from '../../support/ui-partners-3';

/**
 * Venue food orders, live (scenario map › Partners › Venue food orders), on
 * the run's own food-serving venue. It has taken no order — ordering is off
 * and there is no Razorpay account to pay — so what runs here is the board's
 * empty state. Moving, cancelling and opening a paid order need a paid order
 * on the venue's own Razorpay account and are not run.
 *
 * /venues/food-orders (src/pages/venue-food-orders-page) mounts
 * @duncit/venue-food's VenueFoodOrders over `venueFoodOrdersTable`.
 */

describe('Partners · Venue food orders (the run’s own venue, no orders)', () => {
  let world: PartnerWorld;

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
      if (!found.venue.offersFood) {
        throw new Error('Fixture prerequisite: the run venue does not serve food (fixtures/venue-food.cy.ts VFD-03).');
      }
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('VFO-01 the order board answers no orders and says where paid QR orders will appear', () => {
    cy.interceptOperation('VenueFoodOrdersTable');
    visitWithVenue('/venues/food-orders', world.venue.id);
    cy.wait('@VenueFoodOrdersTable').its('response.body.data.venueFoodOrdersTable.total').should('eq', 0);
    cy.byTestId('venue-food-orders-page').should('be.visible');
    cy.byTestId('venue-picker').should('have.value', world.venue.id);
    cy.byTestId('duncit-table-empty').should('have.text', 'No food orders yet. Paid orders from your venue QR appear here.');
  });
});
