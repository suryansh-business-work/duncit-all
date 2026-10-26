/// <reference types="cypress" />
import {
  AUTH_REQUIRED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  type Refusal,
} from '../../../support/access-steps';
import { expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue cancellation policy (/venues/settings) — `updateVenueSettings`
 * (venues/venue/venue.service.ts `updateSettings`) checks the venue is the
 * caller's (or that they hold a Venues console role) and THEN re-validates the
 * policy (`normalizeCancellationInput`) before anything is saved. Every policy
 * sent here is one the server refuses — invalid, or a move of the auto-cancel
 * refund ladder that only Onboarding / Finance may make — so even a Venues
 * console editor, who passes the ownership check, never changes a real venue.
 * Scenario map: Partners › Venue cancellation policy.
 */

const SETTINGS = `mutation E2eUpdateVenueSettings($id: ID!, $input: VenueSettingsInput!) {
  updateVenueSettings(venue_doc_id: $id, input: $input) { id }
}`;

const badInput = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });

/** Two bands on the same window: a policy nobody can read. */
const SAME_WINDOW = {
  cancellation: {
    tiers: [
      { hours_before: 24, charge_type: 'PERCENT', value: 10 },
      { hours_before: 24, charge_type: 'PERCENT', value: 20 },
    ],
  },
};
/** A percent charge above the whole booking. */
const OVER_100 = { cancellation: { tiers: [{ hours_before: 12, charge_type: 'PERCENT', value: 150 }] } };
/** A refund band paying back more than was paid. */
const REFUND_OVER_100 = { cancellation: { refund_tiers: [{ hours_before: 48, refund_pct: 101 }] } };
/** A valid refund ladder no venue holds — a real move of Duncit's terms. */
const NEW_LADDER = { cancellation: { refund_tiers: [{ hours_before: 8759, refund_pct: 37 }] } };

describe('API · A venue’s cancellation policy is changed by its owner, and only as a valid policy', { testIsolation: false }, () => {
  let memberToken = '';
  let editorToken = '';
  let foreignId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    foreignVenueId().then((id) => {
      foreignId = id;
    });
    signInRunAs(['ALL_VENUES_ACCESS']).then((token) => {
      editorToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_VENUES_ACCESS']);
  });

  it('VC-01 a signed-out caller cannot change any venue’s policy', () => {
    expectEachRefused('updateVenueSettings', SETTINGS, { id: foreignId, input: SAME_WINDOW }, [[null, AUTH_REQUIRED]]);
  });

  it('VC-02 a member is refused another owner’s venue before the policy is even read', () => {
    expectEachRefused('updateVenueSettings', SETTINGS, { id: foreignId, input: SAME_WINDOW }, [
      [memberToken, { code: 'FORBIDDEN', message: 'Not your venue' }],
    ]);
    expectEachRefused('updateVenueSettings', SETTINGS, { id: NO_ID, input: SAME_WINDOW }, [
      [memberToken, { code: 'NOT_FOUND', message: 'Venue not found' }],
    ]);
  });

  it('VC-03 two cancellation bands on the same window are refused by the server', () => {
    expectEachRefused('updateVenueSettings', SETTINGS, { id: foreignId, input: SAME_WINDOW }, [
      [editorToken, badInput('each cancellation band needs its own "hours before" window')],
    ]);
  });

  it('VC-04 a percent charge above 100 is refused by the server', () => {
    expectEachRefused('updateVenueSettings', SETTINGS, { id: foreignId, input: OVER_100 }, [
      [editorToken, badInput('cancellation charge must be between 0 and 100')],
    ]);
  });

  it('VC-05 a refund band above 100 percent is refused by the server', () => {
    expectEachRefused('updateVenueSettings', SETTINGS, { id: foreignId, input: REFUND_OVER_100 }, [
      [editorToken, badInput('refund percent must be between 0 and 100')],
    ]);
  });

  it('VC-06 a Venues console editor cannot move the auto-cancel refund ladder', () => {
    expectEachRefused('updateVenueSettings', SETTINGS, { id: foreignId, input: NEW_LADDER }, [
      [
        editorToken,
        { code: 'FORBIDDEN', message: 'Only Onboarding or Finance can change the auto-cancel window and refund ladder' },
      ],
    ]);
  });
});
