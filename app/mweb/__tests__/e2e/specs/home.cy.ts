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
    // Every Home section header is a title + its own "See all" (SectionHeader),
    // so the button is scoped to the section's heading row.
    cy.contains('h2', 'Happening nearby').parent().contains('button', 'See all').click();
    cy.location('pathname').should('eq', '/happening-nearby');
  });

  it('Previous Pods rail + dedicated page show past pods (bug 8)', () => {
    cy.visitApp('/');
    // The rail sits at the bottom of the feed — scroll it into the viewport.
    cy.contains('h2', 'Previous Pods').scrollIntoView().should('be.visible');
    // Club rails carry a "See all" too — take the one in this section's header row.
    cy.contains('h2', 'Previous Pods').parent().contains('button', 'See all').click();
    cy.location('pathname').should('eq', '/previous-pods');
    cy.contains('Old Gig').should('be.visible');
  });

  it('empty feed shows the empty state', () => {
    cy.mockGraphql({ ...bootFixtures, ...homeFeed({ pods: [] }) });
    cy.visitApp('/');
    // HomeEmptyState (mweb.home.homeEmpty) replaced the "No clubs in this category" alert.
    cy.contains(/No pods here yet/i).should('be.visible');
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
