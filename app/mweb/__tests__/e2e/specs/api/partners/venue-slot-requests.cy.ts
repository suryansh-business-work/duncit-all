/// <reference types="cypress" />
import { signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue slot requests — a host's booking request on a venue slot is decided
 * by that venue's owner only (venues/venueSlot/venueSlot.service.ts
 * `approveRequest` / `declineRequest` load the slot and compare its owner
 * before reading its status or touching the pod). The request list is filtered
 * by the caller as owner, so naming another venue lists nothing.
 * Scenario map: Partners › Venue slot requests.
 */

const REQUESTS = `query E2eSlotRequests($venue_id: ID) { venueSlotRequests(venue_id: $venue_id) { __typename } }`;
const DECISION = `query E2eSlotDecision($id: ID!) { venueSlotDecision(slot_id: $id) { __typename } }`;
const APPROVE = `mutation E2eApproveSlotRequest($id: ID!) { approveVenueSlotRequest(slot_id: $id) { id } }`;
const DECLINE = `mutation E2eDeclineSlotRequest($id: ID!) { declineVenueSlotRequest(slot_id: $id, reason: "e2e") { id } }`;

const SLOT_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Slot not found' };

describe('API · Slot requests are decided by the venue’s owner only', { testIsolation: false }, () => {
  let memberToken = '';
  let foreignId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    foreignVenueId().then((id) => {
      foreignId = id;
    });
  });

  it('VSR-01 another venue’s pending requests are not listed to a member', () => {
    expectEachRefused('venueSlotRequests', REQUESTS, { venue_id: foreignId }, [[null, SIGNED_OUT]]);
    cy.gqlRaw(REQUESTS, { venue_id: foreignId }, { token: memberToken }).then((body) =>
      expectAnswer('venueSlotRequests', body, []),
    );
  });

  it('VSR-02 a request that is not on the caller’s slot cannot be approved or declined', () => {
    expectEachRefused('approveVenueSlotRequest', APPROVE, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, SLOT_NOT_FOUND],
    ]);
    expectEachRefused('declineVenueSlotRequest', DECLINE, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, SLOT_NOT_FOUND],
    ]);
  });

  it('VSR-03 the decision page of a slot that is not the caller’s does not open', () => {
    expectEachRefused('venueSlotDecision', DECISION, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, SLOT_NOT_FOUND],
    ]);
  });
});
