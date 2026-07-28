import { exploreFixtures } from '../support/data';

describe('App · Explore', () => {
  beforeEach(() => {
    cy.mockGraphql(exploreFixtures());
  });

  it('renders the reels feed', () => {
    cy.visitApp('/explore');
    cy.byTestId('explore-reels').should('be.visible');
    cy.byTestId('reel-sunset-jam').should('be.visible');
  });

  it('comments open inline without leaving Explore (bug 17)', () => {
    cy.visitApp('/explore');
    cy.byTestId('reel-comment-sunset-jam').should('be.visible').click();
    cy.byTestId('pod-comments-sheet').should('be.visible');
    // Still on Explore (no redirect to Pod Detail).
    cy.byTestId('explore-reels').should('be.visible');
  });
});
