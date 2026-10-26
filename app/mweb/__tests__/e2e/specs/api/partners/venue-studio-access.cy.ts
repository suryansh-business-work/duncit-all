/// <reference types="cypress" />
import { AUTH_REQUIRED, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The Venue studio pages a member must not reach — the dashboard, the venue's
 * pods and the food menu (partners-app /venues/*). The partners app is not
 * portal-gated at sign-in, so the server's answer to a direct call is the
 * whole protection: each read is scoped to venues the caller owns, and naming
 * another owner's venue is refused. Scenario map: Partners › Venue dashboard,
 * Venue pods, Venue food menu, Venue food dashboard, Venue food coupons.
 */

const OWNER_STATS = `query E2eVenueOwnerStats($venue_id: ID) {
  venueOwnerStats(venue_id: $venue_id) { total_venues upcoming_slots booked_slots }
}`;
const VENUE_PODS = `query E2eVenuePods($venue_id: ID) { venuePods(venue_id: $venue_id) { __typename } }`;
const VENUE_PODS_SUMMARY = `query E2eVenuePodsSummary($venue_id: ID) { venuePodsSummary(venue_id: $venue_id) { __typename } }`;
const MY_VENUE = `query E2eMyVenueById($venue_id: ID) { myVenue(venue_id: $venue_id) { id } }`;
const UPDATE_APPROVED = `mutation E2eUpdateApprovedVenue($id: ID!) { updateApprovedVenue(venue_id: $id, input: {}) { id } }`;

const NOT_OWNED_POD_VENUE = { code: 'FORBIDDEN', message: 'You do not own this venue' };

describe('API · Venue studio reads are scoped to the caller’s own venues', { testIsolation: false }, () => {
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

  it('VS-01 the venue dashboard is refused signed out and counts nothing for a member who owns no venue', () => {
    expectEachRefused('venueOwnerStats', OWNER_STATS, {}, [[null, SIGNED_OUT]]);
    cy.gqlRaw(OWNER_STATS, {}, { token: memberToken }).then((body) =>
      expectAnswer('venueOwnerStats', body, { total_venues: 0, upcoming_slots: 0, booked_slots: 0 }),
    );
  });

  it('VS-02 the dashboard of another owner’s venue is refused like a missing one', () => {
    [foreignId, NO_ID].forEach((venueId) => {
      expectEachRefused('venueOwnerStats', OWNER_STATS, { venue_id: venueId }, [
        [memberToken, { code: 'NOT_FOUND', message: 'Venue not found or not yours' }],
      ]);
    });
  });

  it('VS-03 the venue’s pods are refused signed out, empty for a member, and refused for another owner’s venue', () => {
    expectEachRefused('venuePods', VENUE_PODS, {}, [[null, AUTH_REQUIRED]]);
    cy.gqlRaw(VENUE_PODS, {}, { token: memberToken }).then((body) => expectAnswer('venuePods', body, []));
    [foreignId, NO_ID].forEach((venueId) => {
      expectEachRefused('venuePods', VENUE_PODS, { venue_id: venueId }, [[memberToken, NOT_OWNED_POD_VENUE]]);
      expectEachRefused('venuePodsSummary', VENUE_PODS_SUMMARY, { venue_id: venueId }, [
        [memberToken, NOT_OWNED_POD_VENUE],
      ]);
    });
  });

  it('VS-04 another owner’s venue, menu included, does not open as the member’s own', () => {
    cy.gqlRaw(MY_VENUE, { venue_id: foreignId }, { token: memberToken }).then((body) =>
      expectAnswer('myVenue', body, null),
    );
  });

  it('VS-05 the food menu of a venue that is not the caller’s cannot be saved', () => {
    // NO_ID only: an owner edit is never aimed at a real venue.
    expectEachRefused('updateApprovedVenue', UPDATE_APPROVED, { id: NO_ID }, [
      [null, AUTH_REQUIRED],
      [memberToken, { code: 'NOT_FOUND', message: 'Venue not found' }],
    ]);
  });
});
