/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused, expectPage, expectPortalOpens, expectPortalRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Club slot requests (/club-admin-requests in the Clubs console) — a club
 * admin's request for venue slots is read by the Clubs console readers and
 * resolved by its editors (clubs/clubSlotRequest/clubSlotRequest.resolver.ts:
 * `consoleReaders('CLUB')` / `consoleEditors('CLUB')`). A club is not an
 * onboarding application, so the onboarding desk holds neither.
 * Scenario map: Partners › Club slot requests.
 */

const TABLE = `query E2eClubSlotRequests { clubSlotRequestsTable(query: { page_size: 1 }) { total } }`;
const RESOLVE = `mutation E2eResolveClubSlotRequest($id: ID!) { resolveClubSlotRequest(id: $id) { id } }`;

describe('API · Club slot requests belong to the Clubs console', { testIsolation: false }, () => {
  let memberToken = '';
  let onboardingToken = '';
  let clubsStaffToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['ONBOARDING_MANAGER']).then((token) => {
      onboardingToken = token;
    });
    revokeRunRoles(['ONBOARDING_MANAGER']);
    signInRunAs(['ALL_CLUBS_ACCESS']).then((token) => {
      clubsStaffToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_CLUBS_ACCESS']);
  });

  it('CSR-01 the request queue is refused signed out, to a member and to the onboarding desk', () => {
    expectEachRefused('clubSlotRequestsTable', TABLE, {}, [
      [null, SIGNED_OUT],
      [memberToken, ACCESS_DENIED],
      [onboardingToken, ACCESS_DENIED],
    ]);
  });

  it('CSR-02 a request cannot be resolved by a member or the onboarding desk', () => {
    expectEachRefused('resolveClubSlotRequest', RESOLVE, { id: NO_ID }, [
      [memberToken, ACCESS_DENIED],
      [onboardingToken, ACCESS_DENIED],
    ]);
  });

  it('CSR-03 ALL_CLUBS_ACCESS signs in to the Clubs console, not to Club Admins, and reads the queue', () => {
    expectPortalOpens('clubs');
    expectPortalRefused('club-admins');
    cy.gqlRaw(TABLE, {}, { token: clubsStaffToken }).then((body) => expectPage('clubSlotRequestsTable', body));
  });
});
