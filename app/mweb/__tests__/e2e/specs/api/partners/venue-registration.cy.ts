/// <reference types="cypress" />
import { AUTH_REQUIRED, signInRunMember, type Refusal } from '../../../support/access-steps';
import { expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue registration (/register-venue) — every step of an application is the
 * applicant's own. `resolveEditableVenue` (venues/venue/venue.service.ts) looks
 * the application up by id, refuses another owner's BEFORE the step's patch is
 * built, and only then writes; so naming someone else's venue can never edit it.
 * Called without a venue id the steps create a draft for the caller, which is
 * why every call here names one. Scenario map: Partners › Venue registration.
 */

const STEP1 = `mutation E2eVenueStep1($venue_id: ID, $input: VenueStep1Input!) {
  submitVenueStep1(venue_id: $venue_id, input: $input) { id }
}`;
const STEP3 = `mutation E2eVenueStep3($venue_id: ID, $input: VenueStep3Input!) {
  submitVenueStep3(venue_id: $venue_id, input: $input) { id }
}`;
const FINAL = `mutation E2eVenueFinal($venue_id: ID) { submitVenueFinal(venue_id: $venue_id) { id } }`;

const VENUE_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Venue not found' };
const NOT_YOUR_VENUE: Refusal = { code: 'FORBIDDEN', message: 'Not your venue' };

/** The smallest step-1 input the schema accepts. */
const step1 = {
  venue_name: 'E2E venue',
  venue_type: 'Cafe',
  capacity: 1,
  address_line1: 'E2E street',
  city: 'E2E city',
  state: 'E2E state',
  postal_code: '000000',
};
const step3 = { owner_name: 'E2E owner', owner_email: 'nobody@example.com', owner_phone: '0000000000' };

describe('API · Venue registration edits only the applicant’s own application', { testIsolation: false }, () => {
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

  it('VR-01 a signed-out caller cannot save a step of any application', () => {
    expectEachRefused('submitVenueStep1', STEP1, { venue_id: NO_ID, input: step1 }, [[null, AUTH_REQUIRED]]);
    expectEachRefused('submitVenueFinal', FINAL, { venue_id: NO_ID }, [[null, AUTH_REQUIRED]]);
  });

  it('VR-02 a member cannot save the details step of another owner’s venue', () => {
    expectEachRefused('submitVenueStep1', STEP1, { venue_id: foreignId, input: step1 }, [[memberToken, NOT_YOUR_VENUE]]);
    expectEachRefused('submitVenueStep1', STEP1, { venue_id: NO_ID, input: step1 }, [[memberToken, VENUE_NOT_FOUND]]);
  });

  it('VR-03 a member cannot write the owner step or submit another owner’s venue for review', () => {
    expectEachRefused('submitVenueStep3', STEP3, { venue_id: foreignId, input: step3 }, [[memberToken, NOT_YOUR_VENUE]]);
    expectEachRefused('submitVenueFinal', FINAL, { venue_id: foreignId }, [[memberToken, NOT_YOUR_VENUE]]);
  });
});
