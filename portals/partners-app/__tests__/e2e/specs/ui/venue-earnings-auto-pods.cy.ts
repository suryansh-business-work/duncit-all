/// <reference types="cypress" />
import { formatMoney } from '@duncit/utils';
import {
  draftOf,
  partnerWorld,
  publicFlag,
  signInRunPartner,
  visitWithVenue,
  type PartnerWorld,
} from '../../support/ui-partners-3';

/**
 * Partners · Venue Earnings (/venues/earnings) and Venue Auto Pods
 * (/venues/auto-pods), for the run's own venue owner.
 *
 * Venue Earnings (src/pages/venue-earnings-page) renders `myVenueEarningsSummary`
 * as four tiles and `myVenuePayouts` as the table, both summed by the server
 * over the caller's own venues only (api/apps/venue-earnings.cy.ts proves the
 * scoping). The page is asserted against what the server answered — the run's
 * venue has no completed, Finance-released pod, so that is normally nothing.
 *
 * Venue Auto Pods is the Requests hub's tab while the `auto_pods` flag is on
 * (studio-hubs useAutoPodsTab). Its venue picker (@duncit/auto-pods
 * AutoPodVenuePicker) lists the owner's APPROVED, active venues only and picks
 * the first, and the queue (`venueAutoPods(venue_id)`) is asked for THAT venue.
 * A failed queue read offers "Try again". Nothing is accepted or withdrawn.
 *
 * Scenario map: Partners › Venue Earnings ("View venue earnings table",
 * "Denied roles cannot open … (/venues/earnings)" — the signed-out row);
 * Partners › Venue Auto Pods ("Queue loads for the first approved venue",
 * "Queue load failure").
 */

interface Summary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

const GRAPHQL = () => String(Cypress.env('GRAPHQL_URL'));
const operationOf = (body: unknown): string | undefined => (body as { operationName?: string } | undefined)?.operationName;

describe('Partners UI · Venue earnings and Auto Pods (the run’s own venue)', () => {
  let world: PartnerWorld;
  let autoPodsOn = false;

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
    });
    publicFlag('auto_pods').then((on) => {
      autoPodsOn = on;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('VEA-01 signed out, /venues/earnings goes to /login and keeps where it was going', () => {
    cy.clearAuth();
    cy.visitApp('/venues/earnings');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/venues/earnings')}`);
  });

  it('VEA-02 the tiles and the payouts table show exactly what the server summed for the owner', () => {
    cy.interceptOperation('VenueEarnings');
    cy.visitApp('/venues/earnings');
    cy.wait('@VenueEarnings').then(({ response }) => {
      const summary = response?.body.data.myVenueEarningsSummary as Summary;
      const payouts = (response?.body.data.myVenuePayouts ?? []) as Array<{ pod_title: string }>;
      const money = (value: number) => formatMoney(value, { symbol: summary.currency_symbol, decimals: 2 });
      cy.byTestId('venue-earnings-page')
        .should('contain.text', 'Venue Earnings')
        .and('contain.text', 'What your slots earned and your payouts');
      cy.byTestId('venue-earnings-lifetime').should('contain.text', money(summary.lifetime_earnings));
      cy.byTestId('venue-earnings-pending').should('contain.text', money(summary.pending_amount));
      cy.byTestId('venue-earnings-month').should('contain.text', money(summary.this_month_earnings));
      cy.byTestId('venue-earnings-pods').should('contain.text', String(summary.pods_completed));
      if (payouts.length === 0) {
        cy.byTestId('duncit-table-empty').should('have.text', 'Payouts appear here after a pod at your venue completes.');
      } else {
        payouts.forEach((payout) => cy.byTestId('duncit-table-grid').should('contain.text', payout.pod_title));
      }
    });
  });

  it('VEA-03 Auto Pods picks the approved venue, never the draft, and asks the queue for that venue', function () {
    if (!autoPodsOn) this.skip();
    const draft = draftOf(world);
    cy.intercept({ method: 'POST', url: GRAPHQL() }, (req) => {
      const body = req.body as { operationName?: string; variables?: { venue_id?: string | null } };
      if (body.operationName === 'VenueAutoPods' && body.variables?.venue_id === world.venue.id) req.alias = 'VenueQueue';
    });
    visitWithVenue('/venues/auto-pods', world.venue.id);
    cy.wait('@VenueQueue').then(({ response }) => {
      const rows = (response?.body.data.venueAutoPods ?? []) as unknown[];
      if (rows.length === 0) {
        cy.byTestId('auto-pods-empty').should('have.text', 'No Auto Pods are waiting for a venue right now.');
      } else {
        cy.byTestId('auto-pods-queue').should('be.visible');
      }
    });
    cy.byTestId('auto-pod-venue-select').should('contain.text', world.venue.name).find('[role="combobox"]').click();
    cy.byTestId(`auto-pod-venue-option-${world.venue.id}`).should('be.visible');
    cy.byTestId(`auto-pod-venue-option-${draft.id}`).should('not.exist');
  });

  it('VEA-04 a failed queue read says so with Try again, and Try again loads the queue', function () {
    if (!autoPodsOn) this.skip();
    let failing = true;
    let retried = 0;
    cy.intercept({ method: 'POST', url: GRAPHQL() }, (req) => {
      if (operationOf(req.body) !== 'VenueAutoPods') return;
      if (failing) {
        req.reply({ forceNetworkError: true });
        return;
      }
      retried += 1;
    });
    visitWithVenue('/venues/auto-pods', world.venue.id);
    cy.byTestId('auto-pods-error').should('contain.text', 'Could not load Auto Pods. Please try again.');
    cy.byTestId('auto-pods-queue').should('not.exist');
    cy.then(() => {
      failing = false;
    });
    cy.byTestId('auto-pods-retry').click();
    cy.byTestId('auto-pods-error').should('not.exist');
    cy.get('[data-testid="auto-pods-empty"], [data-testid="auto-pods-queue"]').should('have.length', 1);
    cy.then(() => {
      expect(retried, 'Try again asked the server again').to.be.at.least(1);
    });
  });
});
