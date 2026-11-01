/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { foreignVenueId, memberId, refusal } from '../../../support/api-apps';
import { ensureVenue, signInRunPartner, type FixtureVenue } from '../../../support/fixture-world';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Workshop & Event Requests (/venues/event-requests), as the owner of the run's
 * own venue. Scenario map: Apps › Workshop & Event Requests ("Answer an event
 * request", "Read old slot requests").
 *
 * eventRequest.service.ts scopes the owner's inbox to the venues they own and
 * answers (respondToEventRequest) and closes (updateEventRequestStatus) only a
 * request that exists and is theirs — the request is loaded, then the owner is
 * checked, before anything changes. A member cannot ask their own venue for an
 * event. No request is sent to another owner here: that would notify a real
 * partner, so the asks below are the run's own venue (refused) or a note too
 * long to accept (refused before the target is read).
 */

const STATE = `query E2eEventRequestState($type: EventRequestTarget!, $id: ID!) {
  myEventRequestState(target_type: $type, target_id: $id) { is_owner requested request_id }
}`;
const REQUEST = `mutation E2eRequestEvent($input: RequestEventInput!) { requestEvent(input: $input) { requested } }`;
const INBOX = `query E2eReceivedEventRequests($q: TableQueryInput) {
  myReceivedEventRequestsTable(target_type: VENUE, query: $q) { total rows { id target_id status } }
}`;
const COUNTS = `query E2eReceivedEventRequestCounts {
  myReceivedEventRequestCounts(target_type: VENUE) { open accepted countered rejected fulfilled dismissed total }
}`;
const RESPOND = `mutation E2eRespondEventRequest($id: ID!, $response: EventRequestResponse!) {
  respondToEventRequest(id: $id, response: $response) { id }
}`;
const CLOSE = `mutation E2eCloseEventRequest($id: ID!, $status: EventRequestStatus!) {
  updateEventRequestStatus(id: $id, status: $status) { id }
}`;
const HISTORY = `query E2eSlotRequestHistory($venue: ID) {
  myVenueSlotRequestHistory(venue_id: $venue) { slot_id status decision }
}`;
const CONSOLE = `query E2eEventRequestsConsole { eventRequestsTable(target_type: VENUE) { total } }`;

const NOT_FOUND = refusal('NOT_FOUND', 'Request not found');

describe('API · Event requests reach the venue’s owner, who alone answers them', { testIsolation: false }, () => {
  let token = '';
  let venue: FixtureVenue;
  let foreignId = '';

  before(() => {
    signInRunPartner().then((partner) => {
      token = partner;
      ensureVenue(partner).then((found) => {
        venue = found;
      });
      memberId(partner).then((ownId) =>
        foreignVenueId(partner, ownId).then((id) => {
          foreignId = id;
        }),
      );
    });
  });

  it('ER-01 the owner is recognised on their own venue and not on another owner’s', () => {
    cy.gql<{ myEventRequestState: unknown }>(STATE, { type: 'VENUE', id: venue.id }, { token })
      .its('myEventRequestState')
      .should('deep.include', { is_owner: true, requested: false });
    cy.gql<{ myEventRequestState: unknown }>(STATE, { type: 'VENUE', id: foreignId }, { token })
      .its('myEventRequestState.is_owner')
      .should('eq', false);
  });

  it('ER-02 an owner cannot ask their own venue for an event, and an over-long note is refused', () => {
    cy.gqlRaw(REQUEST, { input: { target_type: 'VENUE', target_id: venue.id } }, { token }).then((body) =>
      expectRefused('requestEvent', body, refusal('BAD_USER_INPUT', 'You cannot request an event from yourself')),
    );
    const note = 'x'.repeat(281);
    cy.gqlRaw(REQUEST, { input: { target_type: 'VENUE', target_id: foreignId, note } }, { token }).then((body) =>
      expectRefused('requestEvent', body, refusal('BAD_USER_INPUT', 'Note is too long')),
    );
    cy.gqlRaw(REQUEST, { input: { target_type: 'VENUE', target_id: 'not-a-venue' } }, { token }).then((body) =>
      expectRefused('requestEvent', body, refusal('BAD_USER_INPUT', 'Invalid target id')),
    );
    cy.gql<{ myEventRequestState: unknown }>(STATE, { type: 'VENUE', id: foreignId }, { token })
      .its('myEventRequestState.requested')
      .should('eq', false);
  });

  it('ER-03 the inbox holds only requests for the owner’s venues, and its counts add up', () => {
    cy.gql<{ myReceivedEventRequestsTable: { total: number; rows: Array<{ target_id: string }> } }>(
      INBOX,
      { q: { page_size: 100 } },
      { token },
    ).then(({ myReceivedEventRequestsTable: inbox }) => {
      inbox.rows.forEach((row) => expect(row.target_id, 'a request for the run’s venue').to.equal(venue.id));
      cy.gql<{ myReceivedEventRequestCounts: Record<string, number> }>(COUNTS, {}, { token }).then(
        ({ myReceivedEventRequestCounts: c }) => {
          expect(c.total, 'the counts describe the same inbox').to.equal(inbox.total);
          expect(c.open + c.accepted + c.countered + c.rejected + c.fulfilled + c.dismissed).to.equal(c.total);
        },
      );
    });
    cy.gqlRaw(CONSOLE, {}, { token }).then((body) =>
      expectRefused('eventRequestsTable', body, refusal('FORBIDDEN', 'Access Denied')),
    );
  });

  it('ER-04 accepting, rejecting, countering or closing a request that does not exist is refused', () => {
    ['ACCEPT', 'REJECT', 'COUNTER'].forEach((response) => {
      cy.gqlRaw(RESPOND, { id: NO_ID, response }, { token }).then((body) =>
        expectRefused('respondToEventRequest', body, NOT_FOUND),
      );
    });
    cy.gqlRaw(RESPOND, { id: 'not-a-request', response: 'ACCEPT' }, { token }).then((body) =>
      expectRefused('respondToEventRequest', body, refusal('BAD_USER_INPUT', 'Invalid request id')),
    );
    cy.gqlRaw(CLOSE, { id: NO_ID, status: 'DISMISSED' }, { token }).then((body) =>
      expectRefused('updateEventRequestStatus', body, NOT_FOUND),
    );
    cy.gqlRaw(CLOSE, { id: NO_ID, status: 'OPEN' }, { token }).then((body) =>
      expectRefused('updateEventRequestStatus', body, refusal('BAD_USER_INPUT', 'Invalid status')),
    );
  });

  it('ER-05 the Past slot requests tab reads the owner’s own history only', () => {
    cy.gql<{ myVenueSlotRequestHistory: Array<{ slot_id: string; status: string }> }>(HISTORY, { venue: venue.id }, { token })
      .its('myVenueSlotRequestHistory')
      .should('be.an', 'array');
    cy.gql<{ myVenueSlotRequestHistory: unknown[] }>(HISTORY, { venue: foreignId }, { token })
      .its('myVenueSlotRequestHistory')
      .should('deep.equal', []);
  });
});
