/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs } from '../../../support/access-steps';
import { expectEachRefused, expectPage, expectPortalOpens, expectPortalRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Club admin directory and editor (club-admins.duncit.com) — ALL_CLUB_ADMINS_ACCESS
 * reads and edits the club admins, but approving, rejecting, the commission
 * and the active switch stay with the platform admins and the onboarding desk
 * (clubs/clubAdminProfile/clubAdminProfile.resolver.ts CA_GOVERN). Staff of
 * other consoles get none of it. Every write names an id no profile has; the
 * role check is each resolver's first line. The member's refusal is
 * staff-operations SA-72/73. Scenario map: Partners › Club admin directory, Club admin editor.
 */

const TABLE = `query E2eCaProfiles { clubAdminProfilesTable(query: { page_size: 1 }) { total } }`;
const GOVERN = [
  ['approveClubAdminProfile', `mutation E2eCaApprove($id: ID!) { approveClubAdminProfile(id: $id) { __typename } }`],
  ['rejectClubAdminProfile', `mutation E2eCaReject($id: ID!) { rejectClubAdminProfile(id: $id, notes: "e2e") { __typename } }`],
  ['setClubAdminCommission', `mutation E2eCaCommission($id: ID!) { setClubAdminCommission(id: $id, commission_pct: 5) { __typename } }`],
  [
    'setClubAdminProfileActive',
    `mutation E2eCaActive($id: ID!) { setClubAdminProfileActive(id: $id, is_active: false) { __typename } }`,
  ],
] as const;
const ASSIGN = `mutation E2eCaAssign($id: ID!) { assignClubAdminClubs(id: $id, club_ids: []) { __typename } }`;
const byId = { id: NO_ID };

describe('API · The Club Admins console edits club admins but does not govern them', { testIsolation: false }, () => {
  let clubsStaffToken = '';
  let clubAdminsStaffToken = '';

  before(() => {
    signInRunAs(['ALL_CLUBS_ACCESS']).then((token) => {
      clubsStaffToken = token;
    });
    revokeRunRoles(['ALL_CLUBS_ACCESS']);
    signInRunAs(['ALL_CLUB_ADMINS_ACCESS']).then((token) => {
      clubAdminsStaffToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_CLUB_ADMINS_ACCESS']);
  });

  it('CAD-01 staff of the Clubs console cannot list club admins or assign their clubs', () => {
    expectEachRefused('clubAdminProfilesTable', TABLE, {}, [[clubsStaffToken, ACCESS_DENIED]]);
    expectEachRefused('assignClubAdminClubs', ASSIGN, byId, [[clubsStaffToken, ACCESS_DENIED]]);
  });

  it('CAD-02 ALL_CLUB_ADMINS_ACCESS signs in to Club Admins, not to Clubs, and reads the directory', () => {
    expectPortalOpens('club-admins');
    expectPortalRefused('clubs');
    cy.gqlRaw(TABLE, {}, { token: clubAdminsStaffToken }).then((body) => expectPage('clubAdminProfilesTable', body));
  });

  it('CAD-03 ALL_CLUB_ADMINS_ACCESS is refused approving, rejecting, paying and switching off a club admin', () => {
    GOVERN.forEach(([field, query]) => {
      expectEachRefused(field, query, byId, [[clubAdminsStaffToken, ACCESS_DENIED]]);
    });
  });
});
