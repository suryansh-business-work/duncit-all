/// <reference types="cypress" />
import { runAccount } from '../../../support/run-account';
import {
  declineTracking,
  isUpcomingLinkable,
  listedPods,
  mePlace,
  setHeaderCity,
  visitAndWait,
  type ListedPod,
} from '../../../support/ui-apps-3';

/**
 * Discovery — the club page, live (scenario map › Discovery).
 *
 * /club/:clubSlug resolves the slug (`clubBySlug`), then loads the club's pods
 * and details (ClubDetailsPage). It shows the club's name and locality, the
 * follow and chat actions, and the Pods Schedule segment with its live pods;
 * a slug no club has is "Club not found." — only once the slug lookup itself
 * has answered. The club and its upcoming pod are read from the public queries
 * first, and the run account's header city is set to the club's own so the page
 * opens without the "different location" dialog (put back at the end).
 */

interface ClubRow {
  id: string;
  club_name: string;
  location_id: string | null;
  locality: string | null;
}

const CLUB_BY_SLUG = `query E2eUi3ClubBySlug($slug: String!) {
  clubBySlug(club_slug: $slug) { id club_name location_id locality }
}`;

describe('Discovery (club page)', () => {
  const account = runAccount();
  let originalCity: string | null = null;
  let club: ClubRow;
  let clubPod: ListedPod;

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    mePlace().then((me) => {
      originalCity = me.selected_location_id;
    });
    listedPods().then((pods) => {
      const pod = pods.find((row) => isUpcomingLinkable(row) && !!row.club_id);
      if (!pod?.club_slug) throw new Error('Staging prerequisite: a club with an upcoming listed pod.');
      clubPod = pod;
      cy.gql<{ clubBySlug: ClubRow | null }>(CLUB_BY_SLUG, { slug: pod.club_slug }).then(({ clubBySlug }) => {
        if (!clubBySlug) throw new Error(`Club ${pod.club_slug} of pod ${pod.id} does not resolve by its slug.`);
        club = clubBySlug;
        setHeaderCity(clubBySlug.location_id);
      });
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  after(() => {
    setHeaderCity(originalCity);
  });

  it('DI-01 a club page shows the club, its locality, follow and chat, and its upcoming pod', () => {
    visitAndWait(`/club/${clubPod.club_slug}`, 'ClubDetailsRelated');
    cy.byTestId('club-details-screen').should('be.visible');
    cy.byTestId('location-mismatch-dialog').should('not.exist');
    cy.byTestId('club-summary-header').should('contain.text', club.club_name);
    const locality = club.locality?.trim();
    if (locality) {
      cy.byTestId('club-summary-header-locality').should('contain.text', locality);
    } else {
      cy.byTestId('club-summary-header-locality').should('not.exist');
    }
    cy.byTestId('club-summary-header-follow').should('be.visible');
    cy.byTestId('club-summary-header-chat').should('be.visible');
    cy.byTestId('club-tab-PODS').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId(`pod-card-${clubPod.id}`).should('contain.text', clubPod.pod_title);
  });

  it('DI-02 a club slug no club has says "Club not found."', () => {
    visitAndWait(`/club/e2e-${account.stamp}-no-such-club`, 'ClubBySlug');
    cy.byTestId('club-details-not-found').should('have.text', 'Club not found.');
    cy.byTestId('club-details-error').should('not.exist');
  });
});
