/// <reference types="cypress" />

import { bootFixtures, homeFeed, upcomingPod } from '../support/data';

describe('Home', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
    cy.mockGraphql(bootFixtures);
  });

  it('renders the home shell, status rail and live pods', () => {
    cy.visitApp('/');
    cy.contains('Happening nearby').should('be.visible');
    cy.contains("What's your vibe today?").should('be.visible');
    cy.contains('Jazz Club').should('be.visible');
    cy.contains('Sunset Jam').should('be.visible');
  });

  it('vibe chips include an "All" filter (bug 11) and only categories with pods (bug 6)', () => {
    cy.visitApp('/');
    cy.contains('button', /^All$/).should('be.visible');
    cy.contains('button', /^Music$/).should('be.visible');
    // Sports has no pods in the fixture → its chip is hidden.
    cy.contains('button', /^Sports$/).should('not.exist');
  });

  it('"Happening nearby" header opens the nearby feed (bug 9)', () => {
    cy.visitApp('/');
    // The header row itself is the control (role=button, named after the section).
    cy.get('[role="button"][aria-label="Happening nearby"]').click();
    cy.location('pathname').should('eq', '/happening-nearby');
  });

  it('Previous Pods rail + dedicated page show past pods (bug 8)', () => {
    cy.visitApp('/');
    // The rail sits at the bottom of the feed — scroll it into the viewport.
    cy.contains('Previous Pods').scrollIntoView().should('be.visible');
    // Two "See all" buttons on Home; the Previous Pods rail is the last section.
    cy.get('button:contains("See all")').should('have.length.at.least', 2).last().click();
    cy.location('pathname').should('eq', '/previous-pods');
    cy.contains('Old Gig').should('be.visible');
  });

  it('empty feed shows the no-clubs notice', () => {
    cy.mockGraphql({ ...bootFixtures, ...homeFeed({ pods: [] }) });
    cy.visitApp('/');
    cy.contains(/No clubs in this category/i).should('be.visible');
  });

  // The header brand (aria-label "Go to home and refresh") was replaced by the
  // tagline + city greeting; the Home tab is now the app's go-home control.
  it('the Home tab returns to the home feed from a sub-page (bug 7)', () => {
    cy.visitApp('/previous-pods');
    cy.contains('Previous Pods').should('be.visible');
    cy.get('.MuiBottomNavigation-root').contains('button', 'Home').click();
    cy.location('pathname').should('eq', '/');
    cy.contains('Happening nearby').should('be.visible');
  });

  it('renders only upcoming pods when there are no past pods', () => {
    cy.mockGraphql({ ...bootFixtures, ...homeFeed({ pods: [upcomingPod] }) });
    cy.visitApp('/');
    cy.contains('Sunset Jam').should('be.visible');
    cy.contains('Previous Pods').should('not.exist');
  });
});
