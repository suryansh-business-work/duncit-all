/// <reference types="cypress" />

import { exploreFixtures } from '../support/data';

describe('Explore', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
    cy.mockGraphql(exploreFixtures());
  });

  it('renders the reels feed with a pod', () => {
    cy.visitApp('/explore');
    cy.contains('Sunset Jam').should('be.visible');
    cy.contains('Jazz Club').should('be.visible');
  });

  it('comments open inline without leaving Explore (bug 17)', () => {
    cy.visitApp('/explore');
    cy.contains('Sunset Jam').should('be.visible');
    // MUI 9 icons carry no data-testid; the rail's buttons have accessible names.
    cy.get('button[aria-label="Comments"]').first().click();
    // The comments sheet opens in place — heading shows and the URL stays /explore.
    cy.contains('h6', 'Comments').should('be.visible');
    cy.location('pathname').should('eq', '/explore');
  });
});
