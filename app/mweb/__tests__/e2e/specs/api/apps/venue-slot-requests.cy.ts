/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, foreignVenueId, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue Slot Requests — an owner sees and decides only the requests on their
 * own venues. Scenario map: Apps › Venue Slot Requests ("Owner cannot approve
 * a slot request on another owner's venue").
 *
 * venueSlot.service.ts listRequests pins the owner into the query, so naming
 * somebody else's venue narrows to nothing rather than widening; approve,
 * decline and the decision detail load the slot and then refuse any caller who
 * is not its owner ("Not your slot"), so an id no slot has answers "Slot not
 * found" before any decision is made.
 */

const SLOT_NOT_FOUND = refusal('NOT_FOUND', 'Slot not found');

const REQUESTS = `query E2eSlotRequests($venue: ID) { venueSlotRequests(venue_id: $venue) { slot_id } }`;
const APPROVE = `mutation E2eApproveSlot($id: ID!) { approveVenueSlotRequest(slot_id: $id) { __typename } }`;
const DECLINE = `mutation E2eDeclineSlot($id: ID!) { declineVenueSlotRequest(slot_id: $id) { __typename } }`;
const DECISION = `query E2eSlotDecision($id: ID!) { venueSlotDecision(slot_id: $id) { __typename } }`;

describe('API · Slot requests are decided by the venue owner only', { testIsolation: false }, () => {
  let memberToken = '';
  let venueId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignVenueId(token, id).then((venue) => {
          venueId = venue;
        }),
      );
    });
  });

  it('VSR-01 the request inbox is refused signed out and empty for a member with no venue', () => {
    cy.gqlRaw(REQUESTS, {}, { token: null }).then((body) => expectRefused('venueSlotRequests', body, SIGNED_OUT));
    cy.gqlRaw(REQUESTS, {}, { token: memberToken }).then((body) => expectAnswer('venueSlotRequests', body, []));
  });

  it("VSR-02 naming another owner's venue narrows the inbox to nothing", () => {
    cy.gqlRaw(REQUESTS, { venue: venueId }, { token: memberToken }).then((body) =>
      expectAnswer('venueSlotRequests', body, []),
    );
  });

  it('VSR-03 approving or declining a slot that is not the member’s is refused before any decision', () => {
    cy.gqlRaw(APPROVE, { id: NO_ID }, { token: null }).then((body) =>
      expectRefused('approveVenueSlotRequest', body, SIGNED_OUT),
    );
    cy.gqlRaw(APPROVE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('approveVenueSlotRequest', body, SLOT_NOT_FOUND),
    );
    cy.gqlRaw(DECLINE, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('declineVenueSlotRequest', body, SLOT_NOT_FOUND),
    );
  });

  it('VSR-04 the decision detail of a slot is not readable by a non-owner', () => {
    cy.gqlRaw(DECISION, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('venueSlotDecision', body, SLOT_NOT_FOUND),
    );
    cy.gqlRaw(DECISION, { id: 'not-a-slot' }, { token: memberToken }).then((body) =>
      expectRefused('venueSlotDecision', body, refusal('BAD_USER_INPUT', 'Invalid slot_id')),
    );
  });
});
