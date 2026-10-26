/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { appLocations, expectSharedLink, runMe, selectLocation, watchClipboard } from '../../../support/ui-apps-2';

/**
 * Explore reels (UI), live on staging, read-only apart from the run account's
 * own bookmark (saved and unsaved again).
 *
 * The feed is the pods with a reel in the header's city, narrowed to the
 * header's super category. `before()` finds the launched city with the most
 * reels, makes it the run account's saved city (put back in `after()`), and
 * reads that city's feed with the page's own query, so every count asserted
 * here is the server's. The reel order is shuffled per visit, so a scenario
 * reads which pod is on the first slide rather than assuming one.
 */

interface ReelPod {
  id: string;
  pod_id: string;
  pod_type: 'FREE' | 'PAID';
  club_id: string;
  club_slug: string | null;
  location_id: string | null;
  reel_url: string | null;
}

interface ExploreData {
  pods: ReelPod[];
  clubs: Array<{ id: string; super_category_id: string | null }>;
  superCategories: Array<{ id: string; slug: string }>;
}

const EXPLORE = `query E2eUiExplorePods($locationId: ID) {
  pods(filter: { is_active: true, has_reel: true, location_id: $locationId }) {
    id pod_id pod_type club_id club_slug location_id reel_url
  }
  clubs(filter: { is_active: true }) { id super_category_id }
  superCategories: categories(filter: { level: SUPER }) { id slug }
}`;

const SAVED = `query E2eUiSavedPods { me { saved_pod_ids } }`;

/** The page's own narrowing: a reel, from a club in the selected super category. */
function feedFor(data: ExploreData, superId: string): ReelPod[] {
  const superOf = new Map(data.clubs.map((club) => [club.id, club.super_category_id]));
  return data.pods.filter((pod) => !!pod.reel_url && superOf.get(pod.club_id) === superId);
}

/** The super category with the most reels in `data`, and its feed. */
function busiestSuper(data: ExploreData): { slug: string; feed: ReelPod[] } {
  return data.superCategories
    .map((category) => ({ slug: category.slug, feed: feedFor(data, category.id) }))
    .sort((a, b) => b.feed.length - a.feed.length)[0] ?? { slug: '', feed: [] };
}

const slides = () => cy.byTestIdPrefix('explore-pod-slide-');

/** Press a reel's rail action, through the More menu when the screen moved it there. */
function reelAction(podId: string, key: 'save' | 'share' | 'open' | 'join'): void {
  cy.byTestId(`reel-${podId}`).then(($reel) => {
    const inline = $reel.find(`[data-testid="reel-${key}-${podId}-button"]`);
    if (inline.length > 0) {
      cy.wrap(inline).click();
      return;
    }
    cy.wrap($reel.find('[data-testid="reel-more-button"]')).click();
    cy.byTestId(`reel-more-${key}`).click();
  });
}

describe('Explore reels', { testIsolation: false }, () => {
  let savedLocationId: string | null = null;
  let superSlug = '';
  let feed: ReelPod[] = [];

  const podOf = (id: string): ReelPod => {
    const pod = feed.find((candidate) => candidate.id === id);
    if (!pod) throw new Error(`Slide ${id} is not in the city's reel feed the server returned.`);
    return pod;
  };

  /**
   * Pick the super category on Home, then open Explore from the bottom bar — the
   * pick is app state, and changing it on Explore itself would remount the page
   * and reshuffle the reels under the spec. Yields the pod on the first slide.
   */
  const openExplore = (): Cypress.Chainable<ReelPod> => {
    cy.visitApp('/');
    cy.byTestId(`super-cat-${superSlug}`).click();
    cy.byTestId(`super-cat-${superSlug}`).should('have.attr', 'aria-pressed', 'true');
    cy.interceptOperation('ExplorePods');
    cy.byTestId('tab-bar-Explore').click();
    cy.location('pathname').should('eq', '/explore');
    cy.wait('@ExplorePods');
    cy.byTestId('explore-page').should('be.visible');
    return slides()
      .first()
      .invoke('attr', 'data-testid')
      .then((testId) => podOf(String(testId).replace('explore-pod-slide-', '')));
  };

  before(() => {
    signInRunMember();
    runMe().then((me) => {
      savedLocationId = me.selected_location_id;
    });
    appLocations().then((locations) => {
      const launched = locations.filter((location) => location.is_launched);
      const ranked: Array<{ locationId: string; slug: string; feed: ReelPod[] }> = [];
      launched.forEach((location) => {
        cy.gql<ExploreData>(EXPLORE, { locationId: location.id }).then((data) => {
          ranked.push({ locationId: location.id, ...busiestSuper(data) });
        });
      });
      cy.then(() => {
        const best = ranked.sort((a, b) => b.feed.length - a.feed.length)[0];
        if (!best || best.feed.length === 0) {
          throw new Error('No launched city on staging has an active pod with a reel: Explore has nothing to show.');
        }
        superSlug = best.slug;
        feed = best.feed;
        selectLocation(best.locationId);
      });
    });
  });

  after(() => {
    cy.then(() => selectLocation(savedLocationId));
  });

  it('EX-01 the first reel carries its video, the action rail and the join bar; Refresh refetches', () => {
    openExplore().then((pod) => {
      slides().should('have.length', feed.length);
      cy.byTestId(`reel-${pod.pod_id}`).within(() => {
        cy.byTestId(`reel-video-${pod.pod_id}`).should('exist');
        cy.byTestId('explore-action-rail').should('be.visible');
        cy.byTestId('explore-join-bar').should('be.visible');
      });
    });
    cy.byTestId('explore-refresh').click();
    cy.wait('@ExplorePods');
    slides().should('have.length', feed.length);
  });

  it('EX-02 Open and a double tap both open the pod details page', () => {
    openExplore().then((pod) => {
      expect(pod.club_slug, 'the reel pod has a club page').to.be.a('string').and.not.be.empty;
      reelAction(pod.pod_id, 'open');
      cy.location('pathname').should('eq', `/club/${pod.club_slug}/pod/${pod.pod_id}`);
      cy.byTestId('pod-details-screen').should('exist');
    });
    openExplore().then((pod) => {
      cy.byTestId(`reel-${pod.pod_id}`).dblclick();
      cy.location('pathname').should('eq', `/club/${pod.club_slug}/pod/${pod.pod_id}`);
    });
  });

  it('EX-03 Save adds the pod to your saved items and a second tap removes it; Share copies the pod link', () => {
    openExplore().then((pod) => {
      cy.gql<{ me: { saved_pod_ids: string[] } }>(SAVED).its('me.saved_pod_ids').should('not.include', pod.id);
      cy.interceptOperation('ToggleSavedPod');
      reelAction(pod.pod_id, 'save');
      cy.wait('@ToggleSavedPod').its('response.body.data.toggleSavedPod.saved').should('eq', true);
      cy.gql<{ me: { saved_pod_ids: string[] } }>(SAVED).its('me.saved_pod_ids').should('include', pod.id);
      reelAction(pod.pod_id, 'save');
      cy.wait('@ToggleSavedPod').its('response.body.data.toggleSavedPod.saved').should('eq', false);
      cy.gql<{ me: { saved_pod_ids: string[] } }>(SAVED).its('me.saved_pod_ids').should('not.include', pod.id);

      watchClipboard();
      cy.interceptOperation('ShareLink');
      reelAction(pod.pod_id, 'share');
      cy.location('origin').then((origin) => expectSharedLink(`${origin}/club/${pod.club_slug}/pod/${pod.pod_id}`));
    });
  });

  it('EX-04 the filter sheet narrows by price, counts the matches, and Reset brings every reel back', () => {
    const free = () => feed.filter((pod) => pod.pod_type === 'FREE').length;
    openExplore();
    cy.byTestId('explore-open-filters').click();
    cy.byTestId('explore-filter-sheet').should('be.visible');
    cy.byTestId('explore-filter-reset').should('be.disabled');
    cy.byTestId('explore-filter-apply').should('have.text', `Show ${feed.length} pods`);
    cy.byTestId('explore-filter-price-FREE').click();
    cy.byTestId('explore-filter-apply').should('have.text', `Show ${free()} pods`).click();
    cy.byTestId('explore-filter-sheet').should('not.exist');
    cy.then(() => {
      if (free() === 0) cy.byTestId('explore-empty-state-title').should('have.text', 'No pods match these filters.');
      else slides().should('have.length', free());
    });

    cy.byTestId('explore-open-filters').click();
    cy.byTestId('explore-filter-reset').should('be.enabled').click();
    cy.byTestId('explore-filter-reset').should('be.disabled');
    cy.byTestId('explore-filter-apply').should('have.text', `Show ${feed.length} pods`).click();
    slides().should('have.length', feed.length);
  });
});
