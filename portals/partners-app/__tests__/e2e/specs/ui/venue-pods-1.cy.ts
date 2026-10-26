import {
  chooseOption,
  copyOf,
  countOperation,
  expectNotSent,
  findPartnerWorld,
  gridRow,
  loadCopy,
  marked,
  rememberVenue,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Venue pods (/venues/pods): the pods at the run's venue — its
 * live FREE pod (UPCOMING) and the pod the fixture step cancelled
 * ("pod to cancel", CANCELLED) — under the Upcoming / Current / Past tabs.
 *
 * Nothing is cancelled here. The cancel dialog is only driven to its own
 * refusal (a reason under 5 characters) and closed with "Keep the pod"; the
 * server's refusal is asked of the pod that is ALREADY cancelled.
 *
 * Not here: a real venue cancel (it refunds paid attendees and costs the venue
 * Account Health), attendees with paid bookings, and filing a Request Change
 * Venue (it opens a change request staff must act on).
 */

type Phase = 'UPCOMING' | 'CURRENT' | 'PAST';
const PHASE_OF: Record<string, Phase> = { UPCOMING: 'UPCOMING', ONGOING: 'CURRENT', COMPLETED: 'PAST', CANCELLED: 'PAST' };
const PHASE_COPY: Record<Phase, { key: string; shipped: string; emptyKey: string; empty: string }> = {
  UPCOMING: {
    key: 'mweb.studioOptions.podsUpcoming',
    shipped: 'Upcoming',
    emptyKey: 'mweb.studioOptions.noPodsUpcoming',
    empty: 'No upcoming pods at this venue.',
  },
  CURRENT: {
    key: 'mweb.studioOptions.podsCurrent',
    shipped: 'Current',
    emptyKey: 'mweb.studioOptions.noPodsCurrent',
    empty: 'No pod is running at this venue right now.',
  },
  PAST: {
    key: 'mweb.studioOptions.podsPast',
    shipped: 'Past',
    emptyKey: 'mweb.studioOptions.noPodsPast',
    empty: 'No past pods at this venue yet.',
  },
};

interface VenuePod {
  id: string;
  pod_title: string;
  bucket: string;
  pod_attendees: string[];
}

const VENUE_PODS = `query E2eUiVenuePods($venue: ID) { venuePods(venue_id: $venue) { id pod_title bucket pod_attendees } }`;
const VENUE_CANCEL = `mutation E2eUiVenueCancelCancelled($id: ID!, $reason: String!) {
  venueCancelPod(pod_id: $id, reason: $reason) { pod_id }
}`;

/** Wait for the page's VenuePods request for `venueId`. */
function podsFor(venueId: string | null, tries = 3): Cypress.Chainable<VenuePod[]> {
  return cy.wait('@VenuePods').then(({ request, response }) => {
    if ((request.body.variables.venue_id ?? null) === venueId) {
      return cy.wrap((response?.body?.data?.venuePods ?? []) as VenuePod[], { log: false });
    }
    if (tries <= 1) throw new Error(`No VenuePods request for venue_id ${String(venueId)} was sent.`);
    return podsFor(venueId, tries - 1);
  });
}

/** Open /venues/pods on the run's venue and yield the rows the page received. */
function openVenuePods(venueId: string): Cypress.Chainable<VenuePod[]> {
  rememberVenue(venueId);
  cy.interceptOperation('VenuePods');
  cy.visitApp('/venues/pods');
  return podsFor(venueId);
}

describe('Partners UI · Venue pods', () => {
  let world: PartnerWorld;
  let freePod: VenuePod;
  let cancelledPod: VenuePod;

  before(() => {
    signInPartner();
    loadCopy();
    findPartnerWorld().then((found) => {
      world = found;
      cy.gql<{ venuePods: VenuePod[] }>(VENUE_PODS, { venue: found.venue.id }).then(({ venuePods }) => {
        const free = venuePods.find((pod) => pod.id === found.pod.id);
        if (free?.bucket !== 'UPCOMING') throw new Error('Fixture missing: the free pod is not an upcoming pod at the run’s venue.');
        const cancelled = venuePods.find((pod) => pod.pod_title === marked('pod to cancel'));
        if (cancelled?.bucket !== 'CANCELLED') {
          throw new Error(`Fixture missing: "${marked('pod to cancel')}" is not a cancelled pod at the run’s venue.`);
        }
        freePod = free;
        cancelledPod = cancelled;
      });
    });
  });

  beforeEach(() => {
    signInPartner();
  });

  it('VP-01 the phase tabs count the pods and each lists only its own — the free pod Upcoming, the cancelled one Past', () => {
    openVenuePods(world.venue.id).then((rows) => {
      (['UPCOMING', 'CURRENT', 'PAST'] as Phase[]).forEach((phase) => {
        const count = rows.filter((row) => PHASE_OF[row.bucket] === phase).length;
        const label = copyOf(PHASE_COPY[phase].key, PHASE_COPY[phase].shipped);
        cy.byTestId(`venue-pods-tab-${phase}`).should('have.text', `${label} (${count})`);
      });
    });
    cy.byTestId('venue-pods-tab-UPCOMING').should('have.attr', 'aria-selected', 'true');
    gridRow(freePod.id).should('contain.text', freePod.pod_title);
    gridRow(cancelledPod.id).should('not.exist');
    cy.byTestId('venue-pods-tab-PAST').click();
    cy.location('search').should('contain', 'selectedtab=PAST');
    gridRow(cancelledPod.id).should('contain.text', 'Cancelled');
    gridRow(freePod.id).should('not.exist');
  });

  it('VP-02 the venue select re-asks venuePods, and the search box narrows the rows in place', () => {
    const upcomingEmpty = copyOf(PHASE_COPY.UPCOMING.emptyKey, PHASE_COPY.UPCOMING.empty);
    openVenuePods(world.venue.id);
    gridRow(freePod.id).should('be.visible');
    chooseOption('venue-pods-venue-filter', world.draftVenue.id);
    podsFor(world.draftVenue.id).should('have.length', 0);
    cy.byTestId('duncit-table-grid').should('contain.text', upcomingEmpty);
    chooseOption('venue-pods-venue-filter', world.venue.id);
    podsFor(world.venue.id);
    gridRow(freePod.id).should('be.visible');
    cy.byTestId('table-toolbar-search').type(marked('no such pod'), { delay: 0 });
    gridRow(freePod.id).should('not.exist');
    cy.byTestId('duncit-table-grid').should('contain.text', upcomingEmpty);
    cy.byTestId('table-toolbar-search').clear().type(freePod.pod_title, { delay: 0 });
    gridRow(freePod.id).should('be.visible');
  });

  it('VP-03 a row opens the pod’s details with who is coming, and Close dismisses it', () => {
    openVenuePods(world.venue.id);
    gridRow(freePod.id).find('[col-id="venue_name"]').click();
    cy.byTestId('venue-pod-detail')
      .should('contain.text', freePod.pod_title)
      .and('contain.text', world.venue.name)
      .and('contain.text', copyOf('partners.common.free', 'Free'))
      .and('contain.text', "Who's coming");
    if (freePod.pod_attendees.length === 0) {
      cy.byTestId('venue-pod-detail').should('contain.text', 'No attendees yet.');
    }
    cy.byTestId('venue-pod-detail-close').click();
    cy.byTestId('venue-pod-detail').should('not.exist');
  });

  it('VP-04 a cancel reason under 5 characters is refused before any request, and Keep the pod leaves it live', () => {
    const cancel = countOperation('VenueCancelPod');
    openVenuePods(world.venue.id);
    cy.byTestId(`venue-pod-cancel-${freePod.id}`).should('be.enabled').click();
    cy.byTestId('venue-cancel-pod').should('contain.text', freePod.pod_title);
    cy.byTestId('venue-cancel-pod-reason').find('textarea:not([aria-hidden])').type('abc');
    cy.byTestId('venue-cancel-pod-submit').click();
    cy.byTestId('venue-cancel-pod-reason').should('contain.text', 'Reason must be at least 5 characters');
    expectNotSent(cancel, 'VenueCancelPod');
    cy.byTestId('venue-cancel-pod-keep').click();
    cy.byTestId('venue-cancel-pod').should('not.exist');
    expectNotSent(cancel, 'VenueCancelPod');
    cy.gql<{ venuePods: VenuePod[] }>(VENUE_PODS, { venue: world.venue.id }).then(({ venuePods }) => {
      expect(venuePods.find((pod) => pod.id === freePod.id)?.bucket, 'the free pod').to.equal('UPCOMING');
    });
  });

  it('VP-05 a cancelled pod’s Cancel is disabled, and the server refuses to cancel it again', () => {
    openVenuePods(world.venue.id);
    cy.byTestId('venue-pods-tab-PAST').click();
    cy.byTestId(`venue-pod-cancel-${cancelledPod.id}`).should('be.disabled');
    cy.gqlError(VENUE_CANCEL, { id: cancelledPod.id, reason: marked('cancel again') }).should('eq', 'Pod not found');
  });
});
