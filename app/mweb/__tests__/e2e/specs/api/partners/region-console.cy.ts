/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused, expectPortalRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Region structure and members (regional-club-admin console) — a region is
 * run by its REGIONAL_CLUB_ADMIN (or a super admin): every region operation
 * asks for exactly those two (clubs/region/region.resolver.ts REGIONAL_RW).
 * A city admin is not a regional club admin, and neither is a club admin.
 * The member's refusal of myRegion is staff-operations SA-74.
 * Scenario map: Partners › Region structure, Region members.
 */

const OPERATIONS = [
  ['myRegionTree', `query E2eRegionTree { myRegionTree { __typename } }`, {}],
  ['myRegionMembers', `query E2eRegionMembers { myRegionMembers { __typename } }`, {}],
  ['addRegionClubAdmin', `mutation E2eRegionAdd($id: ID!) { addRegionClubAdmin(user_id: $id) { __typename } }`, { id: NO_ID }],
  [
    'removeRegionClubAdmin',
    `mutation E2eRegionRemove($id: ID!) { removeRegionClubAdmin(user_id: $id) { __typename } }`,
    { id: NO_ID },
  ],
] as const;

describe('API · A region is run by its regional club admin only', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['CITY_ADMIN']).then((token) => {
      cityAdminToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('RC-01 the region’s tree, members and membership changes are refused signed out and to a member', () => {
    OPERATIONS.forEach(([field, query, variables]) => {
      expectEachRefused(field, query, variables, [
        [null, SIGNED_OUT],
        [memberToken, ACCESS_DENIED],
      ]);
    });
  });

  it('RC-02 a city admin cannot sign in to the regional console or touch a region', () => {
    expectPortalRefused('regional-club-admin');
    OPERATIONS.forEach(([field, query, variables]) => {
      expectEachRefused(field, query, variables, [[cityAdminToken, ACCESS_DENIED]]);
    });
  });
});
