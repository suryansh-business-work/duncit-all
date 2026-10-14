/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Admin › User Roles & Host Categories — only SUPER_ADMIN assigns roles
 * (access/role/role.resolver.ts ROLE_ASSIGN_ROLES, the first statement of every
 * mutation, before the user is looked up). Scenario map: Staff › User Roles &
 * Host Categories "Non-super admin cannot assign roles".
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];

const ROLE_WRITES = [
  call(
    'assignUserRoles',
    `mutation E2eAssignUserRoles($id: ID!) { assignUserRoles(user_id: $id, role_keys: ["CITY_ADMIN"]) { __typename } }`,
    { id: NO_ID },
  ),
  call(
    'addUserRole',
    `mutation E2eAddUserRole($id: ID!) { addUserRole(user_id: $id, role_key: "CITY_ADMIN") { __typename } }`,
    { id: NO_ID },
  ),
  call(
    'removeUserRole',
    `mutation E2eRemoveUserRole($id: ID!) { removeUserRole(user_id: $id, role_key: "USER") { __typename } }`,
    { id: NO_ID },
  ),
];

describe('API · Only a super admin assigns roles', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('UR-01 CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused assigning, adding and removing roles', () => {
    expectRolesRefused(ROLES, ROLE_WRITES);
  });
});
