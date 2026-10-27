/// <reference types="cypress" />
import { partnerWorld, signInRunPartner, visitWithVenue, type PartnerWorld } from '../../support/ui-partners-3';

/**
 * Venue food dashboard, live (scenario map › Partners › Venue food dashboard),
 * on the run's own food-serving venue — which has taken no food order: its
 * ordering is off and it has no Razorpay account (fixtures/venue-food.cy.ts),
 * so no guest can pay it. The seeded-orders half of the row (totals matching
 * paid orders) needs paid orders and is not run here.
 *
 * /venues/food-dashboard (src/pages/venue-food-dashboard-page) mounts
 * @duncit/venue-food's VenueFoodDashboard over `venueFoodStats(venue_id, days)`.
 */

const STATS = `query E2eUiP3FoodStats($id: ID!) { venueFoodStats(venue_id: $id) { orders } }`;

describe('Partners · Venue food dashboard (the run’s own venue, no orders)', () => {
  let world: PartnerWorld;

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
      if (!found.venue.offersFood) {
        throw new Error('Fixture prerequisite: the run venue does not serve food (fixtures/venue-food.cy.ts VFD-03).');
      }
      cy.gql<{ venueFoodStats: { orders: number } }>(STATS, { id: found.venue.id }).then(({ venueFoodStats }) => {
        if (venueFoodStats.orders !== 0) throw new Error(`The run venue has ${venueFoodStats.orders} food orders; it should have none.`);
      });
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('VFDB-01 with no orders the dashboard says so, and its breakdowns and feedback are empty', () => {
    cy.interceptOperation('VenueFoodStats');
    visitWithVenue('/venues/food-dashboard', world.venue.id);
    cy.wait('@VenueFoodStats').its('response.body.data.venueFoodStats.orders').should('eq', 0);
    cy.byTestId('venue-food-dashboard-page').should('be.visible');
    cy.byTestId('food-dashboard-empty').should(
      'have.text',
      'No food orders in this period yet. Paid orders from your venue QR are counted here.',
    );
    cy.byTestId('food-dashboard-tiles').should('be.visible');
    cy.byTestId('food-dashboard-dishes').should('contain.text', 'No dishes sold in this period yet.');
    cy.byTestId('food-dashboard-feedback').should(
      'contain.text',
      'No feedback in this period yet. Guests can rate an order once it is served.',
    );
  });
});
