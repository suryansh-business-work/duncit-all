import { submitPassword } from '../../support/login-page';
import { runAccount } from '../../support/run-account';
import {
  chooseOption,
  copyOf,
  countOperation,
  expectNotSent,
  findPartnerWorld,
  loadCopy,
  marked,
  rememberVenue,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Slot requests (/venues/requests) and the decision page the request
 * email opens (/venues/requests/:slotId?action=approve|decline).
 *
 * The run's venue never receives a request: its only booking is the run's own
 * free pod, which books an own-venue slot outright (pods/pod/pod.venue.ts
 * resolveSlotForCreate). So the list is empty, and the decision page is driven
 * with the run's OWN slots — one it publishes here and removes in after(), and
 * the free pod's booked one — never with another partner's request.
 *
 * Not here: approving, declining, expiry and "request changed" — they need a
 * PENDING request, i.e. a second (host) account booking the run's priced slot.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Days ahead of the slot this spec publishes — clear of the fixture's own slots (days 14–21). */
const OWN_SLOT_DAY = 40;

const REQUESTS_QUERY = `query E2eUiSlotRequests { venueSlotRequests(venue_id: null) { slot_id } }`;
const CREATE_SLOT = `mutation E2eUiCreateDecisionSlot($input: BulkCreateVenueSlotsInput!) {
  createVenueSlots(input: $input) { id }
}`;
const DELETE_SLOT = `mutation E2eUiDeleteDecisionSlot($id: ID!) { deleteVenueSlot(slot_id: $id) }`;

/** Wait for the VenueSlotRequests request for `venueId` (null = all venues). */
function requestsFor(venueId: string | null, tries = 3): Cypress.Chainable<unknown[]> {
  return cy.wait('@VenueSlotRequests').then(({ request, response }) => {
    if ((request.body.variables.venue_id ?? null) === venueId) {
      return cy.wrap((response?.body?.data?.venueSlotRequests ?? []) as unknown[], { log: false });
    }
    if (tries <= 1) throw new Error(`No VenueSlotRequests request for venue_id ${String(venueId)} was sent.`);
    return requestsFor(venueId, tries - 1);
  });
}

const emptyCopy = () =>
  copyOf(
    'partners.slotRequestsPage.noPendingSlotRequestsRightNow',
    'No pending slot requests right now. New requests appear here the moment a host books one of your slots.',
  );

describe('Partners UI · Venue slot requests', () => {
  let world: PartnerWorld;
  /** A slot of the run's venue that never had a booking request. */
  let openSlotId = '';

  before(() => {
    signInPartner();
    loadCopy();
    findPartnerWorld().then((found) => {
      world = found;
      const today = new Date();
      const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const start = new Date(midnight + OWN_SLOT_DAY * DAY_MS + 5 * HOUR_MS);
      const slot = {
        start_at: start.toISOString(),
        end_at: new Date(start.getTime() + HOUR_MS).toISOString(),
        price: 0,
        capacity: found.venue.capacity,
        notes: marked('decision page slot'),
      };
      cy.gql<{ createVenueSlots: Array<{ id: string }> }>(CREATE_SLOT, {
        input: { venue_id: found.venue.id, slots: [slot] },
      }).then(({ createVenueSlots }) => {
        openSlotId = createVenueSlots[0].id;
      });
    });
  });

  beforeEach(() => {
    signInPartner();
  });

  after(() => {
    if (!openSlotId) return;
    signInPartner();
    cy.gql(DELETE_SLOT, { id: openSlotId });
  });

  it('SR-01 with no pending future request the list shows its info alert', () => {
    cy.gql<{ venueSlotRequests: unknown[] }>(REQUESTS_QUERY).then(({ venueSlotRequests }) => {
      expect(venueSlotRequests, 'pending requests at the run’s venues').to.have.length(0);
    });
    cy.interceptOperation('VenueSlotRequests');
    cy.visitApp('/venues/requests');
    cy.wait('@VenueSlotRequests');
    cy.byTestId('venue-pods-hub-tab-/venues/requests').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('slot-requests-empty').should('have.text', emptyCopy());
  });

  it('SR-02 the venue select re-asks venueSlotRequests for one venue, and All venues asks for every venue', () => {
    rememberVenue(world.venue.id);
    cy.interceptOperation('VenueSlotRequests');
    cy.visitApp('/venues/requests');
    requestsFor(world.venue.id).should('have.length', 0);
    chooseOption('slot-requests-venue-filter', 'ALL');
    requestsFor(null).should('have.length', 0);
    chooseOption('slot-requests-venue-filter', world.draftVenue.id);
    requestsFor(world.draftVenue.id).should('have.length', 0);
    cy.byTestId('slot-requests-empty').should('have.text', emptyCopy());
  });

  it('SR-03 a malformed slot id on the decision page shows Invalid slot_id and no decision controls', () => {
    cy.interceptOperation('VenueSlotDecision');
    cy.visitApp('/venues/requests/abc');
    cy.wait('@VenueSlotDecision');
    cy.byTestId('slot-decision-error').should('have.text', 'Invalid slot_id');
    cy.byTestId('slot-decision-approve').should('not.exist');
    cy.byTestId('slot-decision-decline').should('not.exist');
  });

  it('SR-04 the run’s own slot that never had a request shows This slot has no booking request', () => {
    cy.interceptOperation('VenueSlotDecision');
    cy.visitApp(`/venues/requests/${openSlotId}`);
    cy.wait('@VenueSlotDecision');
    cy.byTestId('slot-decision-error').should('have.text', 'This slot has no booking request');
    cy.byTestId('slot-decision-approve').should('not.exist');
  });

  it('SR-05 signed out, an emailed ?action=approve link goes to /login, sends nothing, and comes back after sign-in', () => {
    const account = runAccount();
    const link = `/venues/requests/${openSlotId}?action=approve`;
    const approve = countOperation('ApproveVenueSlotRequest');
    cy.clearAuth();
    cy.visitApp(link);
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent(link)}`);
    expectNotSent(approve, 'ApproveVenueSlotRequest');
    cy.interceptOperation('VenueSlotDecision');
    submitPassword(account.email, account.password('CHANGED'));
    cy.location('pathname').should('eq', `/venues/requests/${openSlotId}`);
    cy.location('search').should('eq', '?action=approve');
    cy.wait('@VenueSlotDecision');
    // No request to approve: the page reports it, and the auto-approve never fires.
    cy.byTestId('slot-decision-error').should('have.text', 'This slot has no booking request');
    expectNotSent(approve, 'ApproveVenueSlotRequest');
  });

  // A slot booked outright (the owner's own pod, a free pod on a ₹0 slot) was never a request:
  // venueSlotDecision answers "This slot has no booking request" and the page offers no decision.
  it("SR-06 the free pod's directly booked slot is not offered for a decision", () => {
    const approve = countOperation('ApproveVenueSlotRequest');
    cy.interceptOperation('VenueSlotDecision');
    cy.visitApp(`/venues/requests/${world.pod.slotId}`);
    cy.wait('@VenueSlotDecision');
    cy.byTestId('slot-decision-error').should('have.text', 'This slot has no booking request');
    cy.byTestId('slot-decision-approve').should('not.exist');
    cy.byTestId('slot-decision-decline').should('not.exist');
    expectNotSent(approve, 'ApproveVenueSlotRequest');
  });
});
