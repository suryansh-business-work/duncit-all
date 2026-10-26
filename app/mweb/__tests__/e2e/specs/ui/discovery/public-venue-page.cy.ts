/// <reference types="cypress" />
import { openSignedOut } from '../../../support/account-steps';
import { runAccount } from '../../../support/run-account';
import {
  NO_SUCH_ID,
  declineTracking,
  expectSignInFor,
  isUpcomingLinkable,
  listedPods,
  podPath,
  publicVenues,
  signInFromHere,
  type ListedPod,
  type PublicVenueRow,
} from '../../../support/ui-apps-3';

/**
 * Public venue page, live (scenario map › Public venue page).
 *
 * /venue/:venueId is public (coreRoutes.tsx — no RequireAuth): `publicVenue`
 * answers only for an APPROVED, active venue and null otherwise, which the page
 * shows as "Venue not found". A venue that serves food opens on its Menu with
 * its pods one tab away under Events; any other venue lists its pods on the
 * page. A pod tapped while signed out goes to sign-in with the pod kept as
 * `?redirect` and named on top of the form (AuthPodBanner), and opens once the
 * member is in. The venues and the pod are read from the public queries first.
 */
/** An upcoming listed pod held at one of `venues`, and that venue. */
function podAtVenue(
  pods: readonly ListedPod[],
  venues: readonly PublicVenueRow[],
): { pod: ListedPod; venue: PublicVenueRow } {
  const byId = new Map(venues.map((venue) => [venue.id, venue]));
  const pod = pods.find((row) => !!row.venue_id && byId.has(row.venue_id) && isUpcomingLinkable(row));
  const venue = pod?.venue_id ? byId.get(pod.venue_id) : undefined;
  if (!pod || !venue) throw new Error('Staging prerequisite: an upcoming listed pod at an approved venue.');
  return { pod, venue };
}

describe('Public venue page', () => {
  const account = runAccount();
  let venues: PublicVenueRow[] = [];
  let plainVenue: PublicVenueRow;
  let foodVenue: PublicVenueRow;
  let venuePod: ListedPod;
  let venueOfPod: PublicVenueRow;

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    publicVenues().then((rows) => {
      venues = rows;
      const plain = rows.find((venue) => !venue.offers_food);
      const food = rows.find((venue) => venue.offers_food);
      if (!plain) throw new Error('Staging prerequisite: an approved, active venue that does not serve food.');
      if (!food) throw new Error('Staging prerequisite: an approved, active venue with offers_food on.');
      plainVenue = plain;
      foodVenue = food;
    });
    listedPods().then((pods) => {
      const found = podAtVenue(pods, venues);
      venuePod = found.pod;
      venueOfPod = found.venue;
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('PV-01 signed out, a venue that serves no food renders with its pods and no Menu tab', () => {
    openSignedOut(`/venue/${plainVenue.id}`);
    cy.location('pathname').should('eq', `/venue/${plainVenue.id}`);
    cy.byTestId('venue-details-screen').should('be.visible');
    cy.byTestId('venue-details-header-title').should('have.text', plainVenue.venue_name);
    cy.byTestId('venue-food-tabs').should('not.exist');
    cy.byTestId('venue-pods-section-header-title').should('have.text', 'Pods at this venue');
  });

  it('PV-02 signed out, a venue that serves food opens on its Menu, with Events one tab away', () => {
    openSignedOut(`/venue/${foodVenue.id}`);
    cy.location('pathname').should('eq', `/venue/${foodVenue.id}`);
    cy.byTestId('venue-details-header-title').should('have.text', foodVenue.venue_name);
    cy.byTestId('venue-tab-menu').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('venue-food-menu').should('be.visible');
    cy.byTestId('venue-pods-section').should('not.exist');
    cy.byTestId('venue-tab-events').click();
    cy.location('search').should('contain', 'selectedtab=events');
    cy.byTestId('venue-tab-events').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('venue-pods-section').should('be.visible');
    cy.byTestId('venue-food-menu').should('not.exist');
  });

  it('PV-03 a venue id no approved venue has shows "Venue not found", never a menu', () => {
    openSignedOut(`/venue/${NO_SUCH_ID}`);
    cy.byTestId('venue-details-missing').should('be.visible');
    cy.byTestId('venue-details-header-title').should('have.text', 'Venue not found');
    cy.byTestId('venue-details-empty-title').should(
      'have.text',
      'This venue link may be unavailable or the venue may not be approved yet.',
    );
    cy.byTestId('venue-food-tabs').should('not.exist');
    cy.byTestId('venue-food-menu').should('not.exist');
  });

  it('PV-04 a pod tapped signed out asks to sign in, names the pod, and opens it after sign-in', () => {
    const target = podPath(venuePod);
    openSignedOut(`/venue/${venueOfPod.id}`);
    if (venueOfPod.offers_food) cy.byTestId('venue-tab-events').click();
    cy.byTestId(`pod-card-${venuePod.id}-price`).click();
    expectSignInFor(target);
    cy.byTestId('auth-pod-banner-title').should('have.text', venuePod.pod_title);
    signInFromHere();
    cy.location('pathname').should('eq', target);
  });
});
