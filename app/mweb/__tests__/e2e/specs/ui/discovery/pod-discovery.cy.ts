/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import {
  emptyHomeCity,
  expectInOrder,
  homeCity,
  loadWorld,
  nearbyHomePods,
  previousHomePods,
  useCity,
  type World,
  type WorldCity,
  type WorldPod,
} from '../../../support/ui-apps-1';

/**
 * Pod discovery on Home, live on staging, as the run account (a plain member).
 *
 * `before` reads what staging holds and saves, on the run account, the launched
 * city whose Happening nearby rail is fullest; the header opens there at every
 * boot. What each scenario expects on screen is derived from the same public
 * queries Home reads (support/ui-apps-1.ts), never assumed. The last scenario
 * moves the account to a launched city with nothing upcoming.
 */

/** Home caps the Happening nearby rail at ten cards (useHomeData.ts `featuredPods`). */
const NEARBY_RAIL_CAP = 10;

const SAVED_IDS_QUERY = `query E2eSavedPodIds { me { saved_pod_ids } }`;
const TOGGLE_SAVED_MUTATION = `mutation E2eToggleSavedPod($id: ID!) { toggleSavedPod(pod_doc_id: $id) { saved } }`;

function openHome(): void {
  cy.interceptOperation('HomeFeedLive');
  cy.visitApp('/');
  cy.wait('@HomeFeedLive');
  cy.byTestId('home-screen').should('be.visible');
}

const card = (pod: WorldPod) => cy.byTestId(`pod-card-${pod.pod_id}`).first();

describe('UI Pod discovery', () => {
  let world: World;
  let city: WorldCity;
  let nearby: WorldPod[];
  let lead: WorldPod;

  before(() => {
    signInRunMember();
    loadWorld().then((found) => {
      world = found;
      city = homeCity(found);
      nearby = nearbyHomePods(found, city.id);
      lead = nearby[0];
      useCity(city.id);
    });
  });

  it('PD-01 Home lists the city’s sections in order, and a Happening nearby card opens its pod', () => {
    const club = world.clubsById.get(lead.club_id);
    openHome();
    cy.byTestId('header-location').should('contain.text', city.location_name);
    expectInOrder([
      'home-search',
      'happening-nearby-header',
      'home-featured-pods-rail',
      'host-cta-banner',
      `club-section-${club?.club_id}`,
    ]);
    cy.byTestId('happening-nearby-header-title').should('have.text', 'Happening nearby');
    cy.byTestId(`club-section-${club?.club_id}-header-title`).should('have.text', club?.club_name);
    cy.byTestId('home-featured-pods-rail').within(() => {
      cy.byTestId(`pod-card-${lead.pod_id}-title`).should('have.text', lead.pod_title);
      cy.byTestId(`pod-card-${lead.pod_id}`).click();
    });
    cy.location('pathname').should('eq', `/club/${lead.club_slug}/pod/${lead.pod_id}`);
    cy.byTestId('pod-info-title').should('have.text', lead.pod_title);
  });

  it('PD-02 the filter sheet narrows the rails by price, and Reset brings every pod back', () => {
    const other = lead.pod_type === 'FREE' ? 'PAID' : 'FREE';
    openHome();
    card(lead).should('be.visible');
    cy.byTestId('home-filter-button').click();
    cy.byTestId('filter-bar').should('be.visible');
    cy.byTestId('home-filter-reset').should('be.disabled');
    cy.byTestId(`filter-price-${other}`).click();
    cy.byTestId('home-filter-done').click();
    cy.byTestId(`pod-card-${lead.pod_id}`).should('not.exist');
    cy.byTestId('home-filter-button').click();
    cy.byTestId(`filter-price-${lead.pod_type}`).click();
    cy.byTestId('home-filter-done').click();
    card(lead).should('be.visible');
    cy.byTestId('home-filter-button').click();
    cy.byTestId('home-filter-reset').should('be.enabled').click();
    cy.byTestId('home-filter-reset').should('be.disabled');
    cy.byTestId('home-filter-done').click();
    card(lead).should('be.visible');
  });

  it('PD-03 a vibe chip narrows Home to its category and tapping it again returns to All', () => {
    const withVibe = nearby.find((pod) => {
      const club = world.clubsById.get(pod.club_id);
      return !!club && !!world.vibeOf(club);
    });
    if (!withVibe) throw new Error('Staging prerequisite: no nearby pod belongs to a club with a CATEGORY.');
    const club = world.clubsById.get(withVibe.club_id);
    const vibe = club ? world.vibeOf(club) : null;
    openHome();
    cy.byTestId('vibe-chip-all').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId(`vibe-chip-${vibe}`).click();
    cy.byTestId(`vibe-chip-${vibe}`).should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('vibe-chip-all').should('have.attr', 'aria-pressed', 'false');
    card(withVibe).should('be.visible');
    cy.byTestId(`vibe-chip-${vibe}`).click();
    cy.byTestId('vibe-chip-all').should('have.attr', 'aria-pressed', 'true');
  });

  it('PD-04 See all opens Happening nearby with every nearby pod, searchable, continuing where the rail stops', () => {
    openHome();
    if (nearby.length > NEARBY_RAIL_CAP) {
      cy.byTestId('home-featured-pods-rail').within(() => {
        cy.byTestId('see-all-card').click();
      });
      cy.location('search').should('eq', `?from=${NEARBY_RAIL_CAP}`);
      card(nearby[NEARBY_RAIL_CAP]).should('be.visible');
      openHome();
    } else {
      cy.byTestId('home-featured-pods-rail').within(() => {
        cy.byTestId('see-all-card').should('not.exist');
      });
    }
    cy.byTestId('happening-nearby-see-all').click();
    cy.location('pathname').should('eq', '/happening-nearby');
    cy.byTestId('pod-list-page-header-title').should('have.text', 'Happening nearby');
    card(lead).should('be.visible');
    cy.byTestId('pod-list-page-search-input').type(lead.pod_title, { parseSpecialCharSequences: false });
    card(lead).should('be.visible');
    cy.byTestId('pod-list-page-search-input').clear();
    cy.byTestId('pod-list-page-search-input').type('e2e zz no pod is called this');
    cy.byTestId('pod-list-page-no-results-title').should('have.text', 'No pods match your search.');
  });

  it('PD-05 Previous Pods lists the city’s past pods newest first, or says there are none', () => {
    const previous = previousHomePods(world, city.id);
    cy.visitApp('/previous-pods');
    cy.byTestId('pod-list-page-header-title').should('have.text', 'Previous Pods');
    if (previous.length === 0) {
      cy.byTestId('pod-list-page-empty-title').should('have.text', 'No previous pods to show yet.');
    } else {
      card(previous[0]).should('be.visible');
    }
  });

  it('PD-06 a member who is not a host is invited to become one, with no create-pod button', () => {
    openHome();
    cy.byTestId('host-cta-banner').should('contain.text', 'Become a host');
    cy.byTestId('home-create-pod-fab').should('not.exist');
    cy.byTestId('host-cta-banner-button').should('have.text', 'Get started').click();
    cy.location('pathname').should('eq', '/earn');
  });

  it('PD-07 the bookmark on a pod card saves it to Saved, and a second tap removes it', () => {
    const save = () => cy.byTestId(`pod-card-save-${lead.pod_id}`).first();
    // Start unsaved whatever an earlier spec left: the scenario is the save, then the unsave.
    cy.gql<{ me: { saved_pod_ids: string[] } }>(SAVED_IDS_QUERY).then(({ me }) => {
      if (me.saved_pod_ids.includes(lead.id)) cy.gql(TOGGLE_SAVED_MUTATION, { id: lead.id });
    });
    openHome();
    save().should('have.attr', 'aria-pressed', 'false');
    cy.interceptOperation('ToggleSavedPodCard');
    save().click();
    cy.wait('@ToggleSavedPodCard');
    save().should('have.attr', 'aria-pressed', 'true');
    cy.interceptOperation('SavedItems');
    cy.visitApp('/saved');
    cy.wait('@SavedItems');
    cy.byTestId(`saved-item-card-${lead.id}`).should('contain.text', lead.pod_title);
    openHome();
    save().should('have.attr', 'aria-pressed', 'true').click();
    cy.wait('@ToggleSavedPodCard');
    save().should('have.attr', 'aria-pressed', 'false');
    cy.visitApp('/saved');
    cy.wait('@SavedItems');
    cy.byTestId(`saved-item-card-${lead.id}`).should('not.exist');
  });

  it('PD-08 a launched city with nothing upcoming shows the empty Home', () => {
    useCity(emptyHomeCity(world).id);
    openHome();
    cy.byTestId('home-empty').should('have.text', 'No pods here yet. Pull to refresh or pick a different vibe.');
    cy.byTestId('home-featured-pods-rail').should('not.exist');
  });

  // Home counts only clubs with pods in this city (HomePage.tsx noContent), so an empty city disables both.
  it('PD-09 in a city with no pods or clubs, search and filters are disabled', () => {
    useCity(emptyHomeCity(world).id);
    openHome();
    cy.byTestId('home-empty').should('be.visible');
    cy.byTestId('home-search-input').should('be.disabled');
    cy.byTestId('home-filter-button').should('be.disabled');
  });
});
