/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { CALLS, expectRolesRefused } from '../../../support/api-staff';

/**
 * Admin › Branding — saving the brand is SUPER_ADMIN and TECH_MANAGER only
 * (platform/settings/settings.resolver.ts ADMIN_WRITE), although every admin
 * seat opens the page. Scenario map: Staff › Branding "Branding save refused for
 * other admins".
 */

const REFUSED: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];

describe('API · Branding is saved by a super admin or Tech', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('BR-01 CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused saving the branding', () => {
    expectRolesRefused(REFUSED, [CALLS.updateBranding]);
  });
});
