/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { declineTracking, visitAndWait } from '../../../support/ui-apps-3';

/**
 * Partner studio routes opened by a plain member, live (scenario map › Studio
 * options, the USER row).
 *
 * The studio routes are only `withAuth` on mWeb (partnerRoutes.tsx): what keeps
 * a member out is the page itself and the server scoping its data. A Studio
 * Options page lists nothing for a role the account does not hold and sends it
 * home (studio-options/index.tsx); every per-venue page reads `myVenues`, which
 * is the caller's own (empty for a member), and shows the register prompt
 * instead of figures (NoVenuesAlert, VenuePageFrame). The run account is
 * checked to hold nothing but USER before any of it.
 */

const NO_VENUES_CTA = 'New venue';

describe('Studio options (plain member)', () => {
  before(() => {
    signInRunMember();
  });

  beforeEach(() => {
    declineTracking();
  });

  (['/venues/options', '/host/options', '/clubs/options', '/products/options'] as const).forEach((path, index) => {
    it(`SO-0${index + 1} ${path} lists nothing for a member and sends them home`, () => {
      cy.visitApp(path);
      cy.location('pathname').should('eq', '/');
      cy.byTestId('studio-options-list').should('not.exist');
    });
  });

  it('SO-05 Venue Studio shows the register prompt, not another owner’s figures', () => {
    visitAndWait('/venues/manage', 'MyVenuesDetails');
    cy.byTestId('venue-manage-screen').should('be.visible');
    cy.byTestId('no-venues-alert').should('contain.text', 'You have no venues yet.');
    cy.byTestId('no-venues-alert-cta').should('have.text', NO_VENUES_CTA).and('have.attr', 'href', '/register-venue');
    cy.byTestId('venue-manage-error').should('not.exist');
  });

  it('SO-06 venue Settings asks the member to register a venue first', () => {
    cy.visitApp('/venues/settings');
    cy.byTestId('venue-page-frame').should('be.visible');
    cy.byTestId('no-venues-alert').should(
      'contain.text',
      'Register a venue first — settings apply to a venue you own.',
    );
    cy.byTestId('venue-page-frame-error').should('not.exist');
  });

  it('SO-07 venue Availability asks the member to register a venue first', () => {
    cy.visitApp('/venues/availability');
    cy.byTestId('venue-page-frame').should('be.visible');
    cy.byTestId('no-venues-alert').should(
      'contain.text',
      'Register a venue first — availability belongs to a venue you own.',
    );
    cy.byTestId('venue-page-frame-error').should('not.exist');
  });
});
