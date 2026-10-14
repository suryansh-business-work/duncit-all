/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs } from '../../../support/access-steps';
import {
  expectEachRefused,
  expectPage,
  expectPortalOpens,
  expectPortalRefused,
} from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue editor (Venues console) — ALL_VENUES_ACCESS reads and edits a venue's
 * own details but does not GOVERN it: approving, rejecting, the live switch,
 * the host-request limit and the money (deductions, cancellation trigger) stay
 * with the platform admins and the onboarding desk
 * (portals/console-access.ts `consoleGovernors('VENUE')`). Every governing call
 * names an id no venue has, and the role check is the resolver's first line.
 * Scenario map: Partners › Venue editor.
 */

const byId = { id: NO_ID };
const VENUES_TABLE = `query E2eEditorVenuesTable { venuesTable(query: { page_size: 1 }) { total } }`;
const GOVERN = [
  ['approveVenue', `mutation E2eEditorApprove($id: ID!) { approveVenue(venue_doc_id: $id) { id } }`],
  ['rejectVenue', `mutation E2eEditorReject($id: ID!) { rejectVenue(venue_doc_id: $id, notes: "e2e") { id } }`],
  ['setVenueActive', `mutation E2eEditorActive($id: ID!) { setVenueActive(venue_doc_id: $id, active: false) { id } }`],
  [
    'setVenueHostRequestLimit',
    `mutation E2eEditorLimit($id: ID!) { setVenueHostRequestLimit(venue_doc_id: $id, limit: 1) { id } }`,
  ],
  [
    'setVenueDeductions',
    `mutation E2eEditorDeductions($id: ID!) {
      setVenueDeductions(venue_doc_id: $id, venue_share_pct: 50, venue_commission_pct: 10) { id }
    }`,
  ],
  [
    'setVenueCancellationTrigger',
    `mutation E2eEditorTrigger($id: ID!) {
      setVenueCancellationTrigger(venue_doc_id: $id, trigger_hours: 24, refund_tiers: []) { id }
    }`,
  ],
] as const;
const ADMIN_UPDATE = `mutation E2eEditorAdminUpdate(
  $id: ID!, $step1: VenueStep1Input!, $step2: VenueStep2Input!, $step3: VenueStep3Input!, $status: VenueStatus
) {
  adminUpdateVenue(venue_doc_id: $id, step1: $step1, step2: $step2, step3: $step3, status: $status) { id }
}`;
const steps = {
  step1: {
    venue_name: 'E2E venue',
    venue_type: 'Cafe',
    capacity: 1,
    address_line1: 'E2E street',
    city: 'E2E city',
    state: 'E2E state',
    postal_code: '000000',
  },
  step2: { documents: [] },
  step3: { owner_name: 'E2E owner', owner_email: 'nobody@example.com', owner_phone: '0000000000' },
};

describe('API · The Venues console edits venues but does not govern them', { testIsolation: false }, () => {
  let editorToken = '';

  before(() => {
    signInRunAs(['ALL_VENUES_ACCESS']).then((token) => {
      editorToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_VENUES_ACCESS']);
  });

  it('VED-01 ALL_VENUES_ACCESS signs in to the Venues console and reads the venue list', () => {
    expectPortalOpens('venues');
    cy.gqlRaw(VENUES_TABLE, {}, { token: editorToken }).then((body) => expectPage('venuesTable', body));
  });

  it('VED-02 ALL_VENUES_ACCESS is refused approving, rejecting, deactivating and limiting a venue', () => {
    GOVERN.slice(0, 4).forEach(([field, query]) => {
      expectEachRefused(field, query, byId, [[editorToken, ACCESS_DENIED]]);
    });
  });

  it('VED-03 ALL_VENUES_ACCESS is refused the venue’s money: deductions and the cancellation trigger', () => {
    GOVERN.slice(4).forEach(([field, query]) => {
      expectEachRefused(field, query, byId, [[editorToken, ACCESS_DENIED]]);
    });
  });

  it('VED-04 an editor’s save that also sets the review status is refused before the venue is looked up', () => {
    expectEachRefused('adminUpdateVenue', ADMIN_UPDATE, { id: NO_ID, ...steps, status: 'APPROVED' }, [
      [editorToken, { code: 'FORBIDDEN', message: 'You cannot change a venue review status' }],
    ]);
  });

  it('VED-05 ALL_VENUES_ACCESS does not open the Hosts console: one directory role is not another', () => {
    expectPortalRefused('hosts');
  });
});
