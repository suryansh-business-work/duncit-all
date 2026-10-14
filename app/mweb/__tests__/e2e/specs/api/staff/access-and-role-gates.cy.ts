/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectRolesRefused } from '../../../support/api-staff';

/**
 * Tech console role gate — server, DNS, package updates and stress runs are
 * SUPER_ADMIN and TECH_MANAGER only (TECH_MANAGE in platform/tech/tech.resolver.ts,
 * dns, packageUpdates and stressTest STRESS_MANAGE); database backups are
 * SUPER_ADMIN alone (TECH_EXEC). The signed-out / member half is in
 * tech-console-access.cy.ts; this is the staff half: holding another console's
 * role opens nothing here. Scenario map: Staff › Access and role gates "Tech
 * portal role gate".
 */

const REFUSED: readonly E2eStaffRole[] = ['CITY_ADMIN', 'LOGS_MANAGER', 'COMMUNICATIONS_MANAGER'];

const TECH_READS = [
  call('techServerInfo', `query E2eTechServerInfo { techServerInfo { __typename } }`),
  call('dnsZone', `query E2eDnsZone { dnsZone { __typename } }`),
  call('techPackageUpdates', `query E2eTechPackageUpdates { techPackageUpdates { __typename } }`),
  call('stressRunsTable', `query E2eStressRuns { stressRunsTable(query: { page_size: 1 }) { total } }`),
  call('dbBackupSettings', `query E2eDbBackupSettings { dbBackupSettings { __typename } }`),
];

describe('API · Tech operations refuse the staff of other consoles', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('AG-01 CITY_ADMIN, LOGS_MANAGER and COMMUNICATIONS_MANAGER are refused server info, DNS, package updates, stress runs and backups', () => {
    expectRolesRefused(REFUSED, TECH_READS);
  });
});
