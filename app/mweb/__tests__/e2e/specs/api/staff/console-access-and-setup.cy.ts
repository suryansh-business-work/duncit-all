/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, CALLS, expectCallsRefused } from '../../../support/api-staff';

/**
 * Admin › Console Access & Setup — every admin seat (SUPER_ADMIN, CITY_ADMIN,
 * ZONAL_ADMIN, SUPPORT_USER, FINANCE_USER) opens the console, but each user
 * operation re-checks the role on the server (access/user/user.resolver.ts:
 * DIRECTORY_ROLES read, MUTATING_ROLES edit, SUPER_ADMIN/CITY_ADMIN delete).
 * Scenario map: Staff › Console Access & Setup "Role-limited admins are refused
 * by the server". The SUPPORT_USER half lives in read-vs-write.cy.ts.
 */

const ROLES: readonly E2eStaffRole[] = ['FINANCE_USER', 'ZONAL_ADMIN'];

describe('API · Admin console seats are re-checked on every user operation', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('CAS-01 FINANCE_USER opens Admin but is refused the user directory, edits and deletes', () => {
    asRole('FINANCE_USER', (token) => {
      expectCallsRefused(token, [CALLS.usersTable, CALLS.updateUser, CALLS.deleteUser]);
    });
  });

  it('CAS-02 ZONAL_ADMIN may edit users in its zones but is refused deleting any user', () => {
    // deleteUser admits SUPER_ADMIN and CITY_ADMIN only, before it looks the user up.
    asRole('ZONAL_ADMIN', (token) => {
      expectCallsRefused(token, [CALLS.deleteUser]);
    });
  });
});
