/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Host Studio and Venue Studio › Auto Pods, for a member who is neither a host
 * nor a venue owner. Scenario map: Apps › Host - Auto Pods ("Browse the host
 * Auto Pod queue", "USER or VENUE_OWNER without HOST cannot claim a host Auto
 * Pod") and Apps › Venue Auto Pods ("Browse the venue Auto Pod queue", "Accept
 * blocked by slots, city or a race").
 *
 * autoPod.service.ts listForHost opens offers only in the caller's approved
 * host sub-categories and listForVenue only for venues the caller owns, so a
 * plain member's queues are empty and every count is zero. The enrolment calls
 * (autoPod.claims.ts) load the offer before anything else and venueAcceptAutoPod
 * refuses a call without an offer window before it even loads one, so the ids
 * sent here — none an Auto Pod has — are refused before any claim is written.
 */

const HOST_QUEUE = `query E2eHostAutoPods { hostAutoPods { id } }`;
const VENUE_QUEUE = `query E2eVenueAutoPods { venueAutoPods { id } }`;
const COUNTS = `query E2eAutoPodCounts { myAutoPodActionCounts { venue host club } }`;
const ONE = `query E2eAutoPod($id: ID!) { autoPod(auto_pod_doc_id: $id) { id } }`;
const PROJECTION = `query E2eAutoPodProjection($id: ID!) {
  autoPodHostProjection(auto_pod_doc_id: $id, pod_amount: 499, no_of_spots: 10) { min_spots }
}`;
const ASSIGN = `mutation E2eHostAssignAutoPod($id: ID!) {
  hostAssignAutoPod(auto_pod_doc_id: $id, pod_amount: 499, no_of_spots: 10) { id }
}`;
const WITHDRAW = `mutation E2eHostWithdrawAutoPod($id: ID!) { hostWithdrawAutoPod(auto_pod_doc_id: $id) { id } }`;
const ACCEPT = `mutation E2eVenueAcceptAutoPod($id: ID!, $venue: ID!, $offer: AutoPodVenueOfferInput) {
  venueAcceptAutoPod(auto_pod_doc_id: $id, venue_id: $venue, offer: $offer) { id }
}`;
const VENUE_WITHDRAW = `mutation E2eVenueWithdrawAutoPod($id: ID!) { venueWithdrawAutoPod(auto_pod_doc_id: $id) { id } }`;

const NOT_FOUND = refusal('NOT_FOUND', 'Auto Pod not found');
const INVALID_ID = refusal('BAD_USER_INPUT', 'Invalid auto_pod_doc_id');
const UPDATE_APP = refusal(
  'BAD_USER_INPUT',
  'Auto Pods are accepted with a time and a price now. Please update the app to accept it.',
);

/** A window and terms in the shape the venue dialog sends; never reaches a venue here. */
const OFFER = {
  start_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  end_at: new Date(Date.now() + 3 * 86_400_000 + 7_200_000).toISOString(),
  model: 'FLAT',
  rate: 1000,
};

describe('API · Auto Pods queues and claims, for a member who hosts nothing and owns no venue', { testIsolation: false }, () => {
  let token = '';

  before(() => {
    signInRunMember().then((member) => {
      token = member;
    });
  });

  it('APM-01 a signed-out caller has no Auto Pod queue and cannot claim one', () => {
    cy.gqlRaw(HOST_QUEUE, {}, { token: null }).then((body) => expectRefused('hostAutoPods', body, SIGNED_OUT));
    cy.gqlRaw(VENUE_QUEUE, {}, { token: null }).then((body) => expectRefused('venueAutoPods', body, SIGNED_OUT));
    cy.gqlRaw(ASSIGN, { id: NO_ID }, { token: null }).then((body) => expectRefused('hostAssignAutoPod', body, SIGNED_OUT));
    cy.gqlRaw(ACCEPT, { id: NO_ID, venue: NO_ID, offer: OFFER }, { token: null }).then((body) =>
      expectRefused('venueAcceptAutoPod', body, SIGNED_OUT),
    );
  });

  it('APM-02 a member approved in no host category and owning no venue is offered nothing', () => {
    cy.gql<{ hostAutoPods: unknown[] }>(HOST_QUEUE, {}, { token }).its('hostAutoPods').should('deep.equal', []);
    cy.gql<{ venueAutoPods: unknown[] }>(VENUE_QUEUE, {}, { token }).its('venueAutoPods').should('deep.equal', []);
    cy.gql<{ myAutoPodActionCounts: unknown }>(COUNTS, {}, { token })
      .its('myAutoPodActionCounts')
      .should('deep.equal', { venue: 0, host: 0, club: 0 });
  });

  it('APM-03 an offer that does not exist cannot be read, projected, assigned or withdrawn', () => {
    cy.gqlRaw(ONE, { id: NO_ID }, { token }).then((body) => expectRefused('autoPod', body, NOT_FOUND));
    cy.gqlRaw(PROJECTION, { id: NO_ID }, { token }).then((body) => expectRefused('autoPodHostProjection', body, NOT_FOUND));
    cy.gqlRaw(ASSIGN, { id: NO_ID }, { token }).then((body) => expectRefused('hostAssignAutoPod', body, NOT_FOUND));
    cy.gqlRaw(WITHDRAW, { id: NO_ID }, { token }).then((body) => expectRefused('hostWithdrawAutoPod', body, NOT_FOUND));
    cy.gqlRaw(ASSIGN, { id: 'not-an-offer' }, { token }).then((body) => expectRefused('hostAssignAutoPod', body, INVALID_ID));
  });

  it('APM-04 a venue acceptance without a window and terms is refused before any offer is read', () => {
    cy.gqlRaw(ACCEPT, { id: NO_ID, venue: NO_ID, offer: null }, { token }).then((body) =>
      expectRefused('venueAcceptAutoPod', body, UPDATE_APP),
    );
    cy.gqlRaw(ACCEPT, { id: NO_ID, venue: NO_ID, offer: OFFER }, { token }).then((body) =>
      expectRefused('venueAcceptAutoPod', body, NOT_FOUND),
    );
    cy.gqlRaw(VENUE_WITHDRAW, { id: NO_ID }, { token }).then((body) => expectRefused('venueWithdrawAutoPod', body, NOT_FOUND));
  });
});
