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
 * Pod and Club Locality Chips — clubs can share a name, so the app tells them
 * (and their pods) apart by area. Scenario map: Apps › Pod and Club Locality
 * Chips ("Locality on home club sections and pod cards", "Locality on See all
 * and club page cards").
 *
 * pod.place.ts resolvePodPlace gives every pod its chip text: none for a
 * virtual pod, the venue's locality (else the pod's zone) for a pod at a venue,
 * and the zone for one placed by city. LocalityChip renders nothing for an
 * empty locality, so a card with no area has no chip at all. The club page is
 * opened with the run account's header city set to the club's own (put back at
 * the end), as Discovery does.
 */

interface PlacedPod {
  id: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  venue_id: string | null;
  location_id: string | null;
  zone_name: string | null;
  locality: string | null;
}

const PLACED_PODS = `query E2eLocalityPods { pods(filter: { is_active: true }) { id pod_mode venue_id location_id zone_name locality } }`;
const VENUE_LOCALITIES = `query E2eVenueLocalities { publicVenues { id locality } }`;
const CLUB_BY_SLUG = `query E2eLocalityClub($slug: String!) { clubBySlug(club_slug: $slug) { id location_id locality } }`;

describe('Locality chips (pod cards and club page)', () => {
  const account = runAccount();
  let originalCity: string | null = null;
  let pods: PlacedPod[] = [];
  let clubPod: ListedPod;
  let club: { id: string; location_id: string | null; locality: string | null };

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    mePlace().then((me) => {
      originalCity = me.selected_location_id;
    });
    cy.gql<{ pods: PlacedPod[] }>(PLACED_PODS).then((data) => {
      pods = data.pods;
    });
    listedPods().then((listed) => {
      const pod = listed.find((row) => isUpcomingLinkable(row) && !!row.club_id);
      if (!pod?.club_slug) throw new Error('Staging prerequisite: a club with an upcoming listed pod.');
      clubPod = pod;
      cy.gql<{ clubBySlug: typeof club | null }>(CLUB_BY_SLUG, { slug: pod.club_slug }).then(({ clubBySlug }) => {
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

  it('LC-01 a virtual pod has no locality, and a pod with an area always names one', () => {
    const virtual = pods.filter((p) => p.pod_mode === 'VIRTUAL');
    virtual.forEach((p) => expect(p.locality, `virtual pod ${p.id}`).to.be.null);
    const zoned = pods.filter((p) => p.pod_mode === 'PHYSICAL' && !!p.zone_name?.trim());
    zoned.forEach((p) => expect(p.locality?.trim(), `pod ${p.id} in zone ${p.zone_name}`).to.match(/\S/));
    const byCity = zoned.filter((p) => !p.venue_id && !!p.location_id);
    byCity.forEach((p) => expect(p.locality, `pod ${p.id} placed by city`).to.equal(p.zone_name?.trim()));
  });

  it('LC-02 a pod at a venue carries the venue’s own locality', () => {
    cy.gql<{ publicVenues: Array<{ id: string; locality: string }> }>(VENUE_LOCALITIES).then(({ publicVenues }) => {
      const localityOf = new Map(publicVenues.map((v) => [v.id, v.locality.trim()]));
      const atNamedVenue = pods.filter(
        (p) => p.pod_mode === 'PHYSICAL' && !!p.venue_id && !!localityOf.get(p.venue_id),
      );
      expect(atNamedVenue, 'staging lists pods at venues that name their locality').not.to.be.empty;
      atNamedVenue.forEach((p) =>
        expect(p.locality, `pod ${p.id} at venue ${p.venue_id}`).to.equal(localityOf.get(p.venue_id ?? '')),
      );
    });
  });

  it('LC-03 on the club page the club header and its pod card show their own locality chips', () => {
    visitAndWait(`/club/${clubPod.club_slug}`, 'ClubDetailsRelated');
    cy.byTestId('club-details-screen').should('be.visible');
    const clubLocality = club.locality?.trim();
    if (clubLocality) {
      cy.byTestId('club-summary-header-locality').should('have.text', clubLocality);
    } else {
      cy.byTestId('club-summary-header-locality').should('not.exist');
    }
    const podLocality = pods.find((p) => p.id === clubPod.id)?.locality?.trim();
    cy.byTestId(`pod-card-${clubPod.id}`).within(() => {
      if (podLocality) {
        cy.byTestId('pod-card-locality').should('have.text', podLocality);
      } else {
        cy.byTestId('pod-card-locality').should('not.exist');
      }
    });
  });
});
