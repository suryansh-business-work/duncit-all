import { homeFixtures } from '../support/data';

describe('App · Home', () => {
  beforeEach(() => {
    cy.mockGraphql(homeFixtures());
  });

  it('signed-in boot renders the Home tab + status rail', () => {
    cy.visitApp('/');
    cy.byTestId('home-feed').should('be.visible');
    cy.byTestId('status-mine').should('be.visible');
  });

  it('vibe chips include the "All" filter (bug 11)', () => {
    cy.visitApp('/');
    cy.byTestId('vibe-chip-all').should('be.visible');
  });

  it('"Happening nearby" header is tappable (bug 9)', () => {
    cy.visitApp('/');
    cy.byTestId('happening-nearby-header').should('be.visible');
  });

  it('Previous Pods rail shows past pods with a "See all" (bug 8)', () => {
    cy.visitApp('/');
    // The rail sits below the fold of the home ScrollView; Cypress counts an
    // element clipped by a scroll ancestor as hidden, so scroll to it first.
    cy.byTestId('previous-pods-see-all').scrollIntoView().should('be.visible');
  });
});
