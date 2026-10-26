/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { openFromMenu } from '../../../support/menu-steps';

/**
 * Following feed (UI), live on staging. The run account follows no member and
 * no club, so both tabs of /follow are its empty states — which is what this
 * file checks, together with the tab being kept in the URL. The feeds the run
 * account cannot fill without following somebody are listed as not automated.
 */

const FEED = `query E2eUiFollowingFeed($source: FollowingFeedSource!) { followingFeed(source: $source, limit: 60) { id } }`;

const tab = (key: 'clubs' | 'people') => cy.byTestId(`following-tab-${key}`);

/** Wait for the feed of `source` to answer (the page asks per tab). */
function feedAnswered(): void {
  cy.wait('@FollowingFeed');
  cy.byTestId('following-feed-loading').should('not.exist');
}

describe('Social - following feed', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
    (['CLUBS', 'PEOPLE'] as const).forEach((source) => {
      cy.gql<{ followingFeed: unknown[] }>(FEED, { source }).then(({ followingFeed }) => {
        expect(followingFeed, `the run account's ${source} feed starts empty`).to.have.length(0);
      });
    });
  });

  it('FF-01 the menu tile opens Following on Clubs; People is kept in the URL across a reload', () => {
    cy.interceptOperation('FollowingFeed');
    openFromMenu('sidebar-grid-following', '/follow');
    feedAnswered();
    cy.byTestId('following-screen').should('be.visible');
    tab('clubs').should('have.attr', 'aria-selected', 'true');
    tab('people').should('have.attr', 'aria-selected', 'false').click();
    feedAnswered();
    tab('people').should('have.attr', 'aria-selected', 'true');
    cy.location('search').should('contain', 'selectedtab=PEOPLE');
    cy.reload();
    tab('people').should('have.attr', 'aria-selected', 'true');
  });

  it('FF-02 each empty tab says how to fill it', () => {
    cy.interceptOperation('FollowingFeed');
    cy.visitApp('/follow');
    feedAnswered();
    cy.byTestId('following-feed-empty').should('contain.text', 'Follow clubs to see their posts here');
    tab('people').click();
    feedAnswered();
    cy.byTestId('following-feed-empty').should('contain.text', 'Follow people to see their posts here');
  });
});
