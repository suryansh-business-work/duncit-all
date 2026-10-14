/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';
import { homeCity, loadWorld, nearbyHomePods, useCity, type WorldClub } from '../../../support/ui-apps-1';

/**
 * Search & Explore, live on staging. /search groups clubs by whether they host
 * a pod soon (searchDiscovery); what each scenario expects is the server's own
 * answer to the same input, asked through the API with the same session.
 * Explore's filter sheet is mWeb-only and is checked for its reset.
 */

const SEARCH_QUERY = `query E2eSearch($input: SearchDiscoveryInput) {
  searchDiscovery(input: $input) { happening { club { id } } more_clubs { club { id } } }
}`;

type SearchAnswer = {
  searchDiscovery: { happening: Array<{ club: { id: string } }>; more_clubs: Array<{ club: { id: string } }> };
};

/** The club ids the server answers for this input, happening-soon first. */
const searchIds = (input: { query?: string; category_id?: string }) =>
  cy.gql<SearchAnswer>(SEARCH_QUERY, { input }).then((data) =>
    [...data.searchDiscovery.happening, ...data.searchDiscovery.more_clubs].map((row) => row.club.id),
  );

const searchBox = () => cy.byTestId('search-bar-input-input');
const queryParam = () => cy.location('search').then((search) => new URLSearchParams(search).get('q'));

function openSearch(): void {
  cy.visitApp('/search');
  cy.byTestId('search-page').should('be.visible');
}

/** Type a keyword and wait for the debounced search to answer. */
function searchFor(keyword: string): void {
  cy.interceptOperation('SearchDiscovery');
  searchBox().type(keyword, { delay: 0, parseSpecialCharSequences: false });
  cy.wait('@SearchDiscovery');
}

describe('UI Search & Explore', () => {
  let club: WorldClub;
  let vibe: string;
  const clubName = () => club.club_name.trim();

  before(() => {
    signInRunMember();
    loadWorld().then((world) => {
      const city = homeCity(world);
      useCity(city.id);
      const found = nearbyHomePods(world, city.id)
        .map((pod) => world.clubsById.get(pod.club_id))
        .find((row): row is WorldClub => !!row && !!world.vibeOf(row));
      if (!found) throw new Error('Staging prerequisite: no club with an upcoming pod belongs to an active CATEGORY.');
      club = found;
      vibe = String(world.vibeOf(found));
    });
  });

  it('SE-01 typing a club’s name lists it, and clearing the box brings the category quick actions back', () => {
    searchIds({ query: clubName() }).then((ids) => {
      if (ids.length === 0) throw new Error(`searchDiscovery finds nothing for "${clubName()}".`);
      openSearch();
      cy.byTestId('category-actions-header-title').should('have.text', 'Discover Experiences by Interest');
      searchFor(clubName());
      queryParam().should('eq', clubName());
      cy.byTestId('search-results').should('be.visible');
      cy.byTestId(`search-club-card-${ids[0]}`).should('exist');
      cy.byTestId('search-bar-clear').click();
      queryParam().should('be.null');
      cy.byTestId('category-actions').should('be.visible');
      cy.byTestId('search-results').should('not.exist');
    });
  });

  it('SE-02 a category quick action runs a category search, and All in the filter returns to the quick actions', () => {
    searchIds({ category_id: vibe }).then((ids) => {
      openSearch();
      cy.interceptOperation('SearchDiscovery');
      cy.byTestId(`category-actions-item-${vibe}`).click();
      cy.wait('@SearchDiscovery').its('request.body.variables.input.category_id').should('eq', vibe);
      cy.byTestId('search-results').should('be.visible');
      if (ids.length === 0) {
        cy.byTestId('search-empty-state-message-title').should('have.text', 'Nothing Here Yet');
      } else {
        cy.byTestId(`search-club-card-${ids[0]}`).should('exist');
      }
      cy.byTestId('search-results-filter').click();
      cy.byTestId('search-filter-sheet-chip-all').click();
      cy.byTestId('search-filter-sheet-apply').click();
      cy.byTestId('category-actions').should('be.visible');
    });
  });

  it('SE-03 results can be re-ordered and narrowed to one category, and All restores them', () => {
    searchIds({ query: clubName(), category_id: vibe }).then((narrowed) => {
      openSearch();
      searchFor(clubName());
      cy.byTestId('search-results-sort').click();
      cy.byTestId('search-sort-menu-option-RELEVANCE').should('have.attr', 'aria-pressed', 'true');
      cy.byTestId('search-sort-menu-option-POPULAR').click();
      cy.byTestId('search-sort-menu').should('not.exist');
      cy.byTestId('search-results-sort').click();
      cy.byTestId('search-sort-menu-option-POPULAR').should('have.attr', 'aria-pressed', 'true');
      cy.byTestId('search-sort-menu-close').click();
      cy.interceptOperation('SearchDiscovery');
      cy.byTestId('search-results-filter').click();
      cy.byTestId(`search-filter-sheet-chip-${vibe}`).click();
      cy.byTestId('search-filter-sheet-apply').click();
      cy.wait('@SearchDiscovery').its('request.body.variables.input').should('deep.equal', {
        query: clubName(),
        category_id: vibe,
      });
      cy.byTestId(`search-club-card-${club.id}`).should(narrowed.includes(club.id) ? 'exist' : 'not.exist');
      cy.byTestId('search-results-filter').click();
      cy.byTestId('search-filter-sheet-chip-all').click();
      cy.byTestId('search-filter-sheet-apply').click();
      cy.byTestId('search-results').should('be.visible');
      queryParam().should('eq', clubName());
    });
  });

  it('SE-04 a keyword that matches nothing offers Share a Pod Idea and Earn With Duncit', () => {
    const keyword = `zzq e2e ${runAccount().stamp} no such pod`;
    searchIds({ query: keyword }).should('have.length', 0);
    openSearch();
    searchFor(keyword);
    cy.byTestId('search-empty-state-message-title').should('have.text', 'No Pods Match Your Search');
    cy.byTestId('search-empty-state-share-idea-button').should('have.text', 'Share a Pod Idea');
    cy.byTestId('search-empty-state-earn-button').should('have.text', 'Earn With Duncit').click();
    cy.location('pathname').should('eq', '/earn');
  });

  it('EX-01 the Explore filter sheet counts what is changed, and Reset returns every chip to its default', () => {
    cy.visitApp('/explore');
    cy.byTestId('explore-page').should('be.visible');
    cy.byTestId('explore-open-filters').click();
    cy.byTestId('explore-filter-reset').should('be.disabled');
    cy.byTestId('explore-filter-preset-TRENDING').click();
    cy.byTestId('explore-filter-sort-PRICE_LOW').click();
    cy.byTestId('explore-filter-price-FREE').click();
    cy.byTestId('explore-filter-reset').should('be.enabled').click();
    cy.byTestId('explore-filter-reset').should('be.disabled');
    cy.byTestId('explore-filter-apply').click();
    cy.byTestId('explore-filter-apply').should('not.exist');
  });
});
