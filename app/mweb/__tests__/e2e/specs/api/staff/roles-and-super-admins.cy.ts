/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRolesRefused, expectTableRead, NO_ID } from '../../../support/api-staff';

/**
 * Admin › Roles & Super Admins — the role catalogue is read by SUPER_ADMIN,
 * CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER (access/role/rbac.resolver.ts
 * READ_ROLES) and changed by SUPER_ADMIN alone (ADMIN_ROLES; grantAdminAccess in
 * role.resolver.ts ROLE_ASSIGN_ROLES). Scenario map: Staff › Roles & Super
 * Admins "Role changes refused for non-super admins".
 */

const READERS: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];
const ROLES: readonly E2eStaffRole[] = [...READERS, 'FINANCE_USER'];

const ROLES_TABLE = call('rolesTable', `query E2eRolesTable { rolesTable(query: { page_size: 1 }) { total } }`);
const ROLE_WRITES = [
  call(
    'createRole',
    `mutation E2eCreateRole { createRole(input: { key: "E2E_NEVER_CREATED", name: "Never created" }) { __typename } }`,
  ),
  call('updateRole', `mutation E2eUpdateRole($id: ID!) { updateRole(role_id: $id, input: {}) { __typename } }`, { id: NO_ID }),
  call('deleteRole', `mutation E2eDeleteRole($id: ID!) { deleteRole(role_id: $id) }`, { id: NO_ID }),
  call('grantAdminAccess', `mutation E2eGrantAdmin($id: ID!) { grantAdminAccess(user_id: $id) { __typename } }`, { id: NO_ID }),
];

describe('API · Roles are read by admins and changed by a super admin', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('RS-01 CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER read the role catalogue but are refused every role change', () => {
    READERS.forEach((role) => {
      asRole(role, (token) => {
        expectTableRead(token, ROLES_TABLE);
        expectCallsRefused(token, ROLE_WRITES);
      });
    });
  });

  it('RS-02 FINANCE_USER is refused even reading the role catalogue', () => {
    expectRolesRefused(['FINANCE_USER'], [ROLES_TABLE]);
  });
});
