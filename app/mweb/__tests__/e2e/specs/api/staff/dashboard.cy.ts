/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, CALLS, expectRead, expectRolesRefused } from '../../../support/api-staff';

/**
 * Admin › Dashboard — every admin seat opens the console, but the totals are
 * read by SUPER_ADMIN and CITY_ADMIN only (platform/analytics/analytics.resolver.ts
 * ADMIN_ROLES). Scenario map: Staff › Dashboard "Dashboard for roles without
 * totals access".
 */

const REFUSED: readonly E2eStaffRole[] = ['ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];
const ROLES: readonly E2eStaffRole[] = [...REFUSED, 'CITY_ADMIN'];

describe('API · Admin dashboard totals by role', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('DB-01 ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused the dashboard totals', () => {
    expectRolesRefused(REFUSED, [CALLS.dashboardTotals]);
  });

  it('DB-02 CITY_ADMIN reads the totals, which count at least the run account itself', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ users_total: number }>(token, CALLS.dashboardTotals).then((totals) => {
        expect(totals.users_total, 'users on the platform').to.be.at.least(1);
      });
    });
  });
});
