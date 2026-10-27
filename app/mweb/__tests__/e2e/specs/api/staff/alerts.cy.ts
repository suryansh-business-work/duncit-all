/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { call, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Analytics › Alerts — reading, checking and deleting alerts is SUPER_ADMIN
 * and ANALYTICS_MANAGER only (platform/analytics/alerts/analyticsAlert.resolver.ts
 * ANALYTICS_ROLES, first statement). Scenario map: Staff › Alerts "Create,
 * check-now, edit and delete an alert" (role matrix: denied to others).
 */

const REFUSED: readonly E2eStaffRole[] = ['CITY_ADMIN', 'LOGS_MANAGER'];

const ALERT_CALLS = [
  call('analyticsAlerts', `query E2eAnalyticsAlerts { analyticsAlerts { __typename } }`),
  call(
    'checkAnalyticsAlertNow',
    `mutation E2eCheckAlertNow($id: ID!) { checkAnalyticsAlertNow(id: $id) { __typename } }`,
    { id: NO_ID },
  ),
  call('deleteAnalyticsAlert', `mutation E2eDeleteAlert($id: ID!) { deleteAnalyticsAlert(id: $id) }`, { id: NO_ID }),
];

describe('API · Analytics alerts are for Analytics staff', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(REFUSED);
  });

  it('AL-01 CITY_ADMIN and LOGS_MANAGER are refused listing, checking and deleting alerts', () => {
    expectRolesRefused(REFUSED, ALERT_CALLS);
  });
});
