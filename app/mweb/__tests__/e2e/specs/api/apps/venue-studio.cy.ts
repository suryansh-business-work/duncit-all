/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, foreignVenueId, marked, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue Studio — an owner reads and edits only their own venues. Scenario map:
 * Apps › Venue Studio ("Owner cannot cancel or inspect pods at another owner's
 * venue", "Owner cannot edit availability, settings or Auto Pods of another
 * venue").
 *
 * venuePods.service.ts ownedVenues narrows every Studio read by owner;
 * venueSlot.service.ts listForVenue lets only the owner read every slot, and
 * ensureOwnedVenue answers someone else's venue exactly like a missing one.
 * venueCancelPod (pod.cancellation.ts) checks the reason, then the pod, then
 * the venue — so it is only ever aimed at an id no pod has.
 */

const NOT_OWNER = refusal('FORBIDDEN', 'You do not own this venue');
const NOT_YOURS = refusal('NOT_FOUND', 'Venue not found or not yours');

const VENUE_PODS = `query E2eVenuePods($venue: ID) { venuePods(venue_id: $venue) { __typename } }`;
const VENUE_SUMMARY = `query E2eVenuePodsSummary($venue: ID) { venuePodsSummary(venue_id: $venue) { scope_count total } }`;
const SLOTS = `query E2eVenueSlots($venue: ID!) { venueSlots(venue_id: $venue) { __typename } }`;
const CREATE_SLOTS = `mutation E2eCreateVenueSlots($input: BulkCreateVenueSlotsInput!) {
  createVenueSlots(input: $input) { __typename }
}`;
const VENUE_CANCEL = `mutation E2eVenueCancelPod($id: ID!, $reason: String!) {
  venueCancelPod(pod_id: $id, reason: $reason) { __typename }
}`;

describe("API · Venue Studio reaches only the owner's venues", { testIsolation: false }, () => {
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

  it('VS-01 a member with no venue reads no pods and empty figures', () => {
    cy.gqlRaw(VENUE_PODS, {}, { token: null }).then((body) => expectRefused('venuePods', body, AUTH_REQUIRED));
    cy.gqlRaw(VENUE_PODS, {}, { token: memberToken }).then((body) => expectAnswer('venuePods', body, []));
    cy.gqlRaw(VENUE_SUMMARY, {}, { token: memberToken }).then((body) =>
      expectAnswer('venuePodsSummary', body, { scope_count: 0, total: 0 }),
    );
  });

  it("VS-02 another owner's venue cannot be narrowed to in Studio", () => {
    cy.gqlRaw(VENUE_PODS, { venue: venueId }, { token: memberToken }).then((body) =>
      expectRefused('venuePods', body, NOT_OWNER),
    );
    cy.gqlRaw(VENUE_SUMMARY, { venue: venueId }, { token: memberToken }).then((body) =>
      expectRefused('venuePodsSummary', body, NOT_OWNER),
    );
  });

  it("VS-03 another owner's full availability is not readable", () => {
    cy.gqlRaw(SLOTS, { venue: venueId }, { token: null }).then((body) => expectRefused('venueSlots', body, SIGNED_OUT));
    cy.gqlRaw(SLOTS, { venue: venueId }, { token: memberToken }).then((body) =>
      expectRefused('venueSlots', body, refusal('FORBIDDEN', 'Only the venue owner can view all slots')),
    );
  });

  it("VS-04 slots cannot be added to another owner's venue, which answers like a missing one", () => {
    cy.gqlRaw(CREATE_SLOTS, { input: { venue_id: venueId, slots: [] } }, { token: memberToken }).then((body) =>
      expectRefused('createVenueSlots', body, NOT_YOURS),
    );
    cy.gqlRaw(CREATE_SLOTS, { input: { venue_id: NO_ID, slots: [] } }, { token: memberToken }).then((body) =>
      expectRefused('createVenueSlots', body, NOT_YOURS),
    );
  });

  it('VS-05 a venue cancel needs a reason, and a pod that does not exist answers "Pod not found"', () => {
    cy.gqlRaw(VENUE_CANCEL, { id: NO_ID, reason: 'no' }, { token: memberToken }).then((body) =>
      expectRefused('venueCancelPod', body, refusal('BAD_USER_INPUT', 'Please describe why you are cancelling this pod')),
    );
    cy.gqlRaw(VENUE_CANCEL, { id: NO_ID, reason: marked('venue-cancel') }, { token: memberToken }).then((body) =>
      expectRefused('venueCancelPod', body, refusal('NOT_FOUND', 'Pod not found')),
    );
  });
});
