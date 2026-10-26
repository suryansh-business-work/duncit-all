/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectRolesRefused } from '../../../support/api-staff';

/**
 * Admin › Portal App Settings — portal modes and per-portal features are read
 * and changed by SUPER_ADMIN and TECH_MANAGER only
 * (platform/portalMode/portalMode.resolver.ts TECH_MANAGE). Scenario map: Staff
 * › Portal App Settings "Portal feature change refused".
 */

const REFUSED: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];

const PORTAL_SETTINGS = [
  call('portalModes', `query E2ePortalModes { portalModes { __typename } }`),
  call(
    'setPortalAppFeatures',
    `mutation E2eSetPortalAppFeatures { setPortalAppFeatures(key: "admin", chat_enabled: true) { __typename } }`,
  ),
  call('setPortalMode', `mutation E2eSetPortalMode { setPortalMode(key: "admin", mode: LIVE) { __typename } }`),
];

describe('API · Portal modes and features are for a super admin or Tech', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('PS-01 CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused reading and changing portal modes', () => {
    expectRolesRefused(REFUSED, PORTAL_SETTINGS);
  });
});
