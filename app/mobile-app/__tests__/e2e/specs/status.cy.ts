import { followedAuthorFixtures, homeFixtures, story } from '../support/data';

describe('App · Stories', () => {
  it('a followed story tile opens the full-screen viewer (bugs 1-4)', () => {
    cy.mockGraphql({ ...homeFixtures({ stories: [story] }), ...followedAuthorFixtures() });
    cy.visitApp('/');
    cy.byTestId(`status-user-${story.author_id}`).click();
    cy.byTestId('status-viewer').should('be.visible');
    cy.byTestId('status-viewer-close').click();
    cy.byTestId('status-viewer').should('not.exist');
  });

  it('the "Your story" tile is always present for uploading', () => {
    cy.mockGraphql(homeFixtures());
    cy.visitApp('/');
    cy.byTestId('status-mine').should('be.visible');
    cy.byTestId('status-mine-badge').should('be.visible');
  });
});
