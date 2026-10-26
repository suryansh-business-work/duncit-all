/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectRead, expectRolesRefused, NO_ID } from '../../../support/api-staff';

/**
 * Admin › User App Activity — the activity calendar and clickstream are read by
 * SUPER_ADMIN and CITY_ADMIN only (platform/analytics/analytics.resolver.ts
 * ADMIN_ROLES). Scenario map: Staff › User App Activity "Activity access for
 * other roles".
 */

const REFUSED: readonly E2eStaffRole[] = ['ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];
const ROLES: readonly E2eStaffRole[] = [...REFUSED, 'CITY_ADMIN'];

const ACTIVITY_YEAR = call(
  'userActivityYear',
  `query E2eUserActivityYear($id: ID!) { userActivityYear(user_id: $id) { total_visits days { __typename } } }`,
  { id: NO_ID },
);
const CLICKSTREAM = call(
  'userClickstream',
  `query E2eUserClickstream($id: ID!) { userClickstream(user_id: $id, date: "2026-01-01", limit: 1) { __typename } }`,
  { id: NO_ID },
);

describe('API · User app activity is for super and city admins', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('UA-01 ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused the activity calendar and clickstream', () => {
    expectRolesRefused(REFUSED, [ACTIVITY_YEAR, CLICKSTREAM]);
  });

  it('UA-02 CITY_ADMIN reads a calendar, and an account that never opened the app has no visits', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ total_visits: number; days: unknown[] }>(token, ACTIVITY_YEAR).then((year) => {
        expect(year.total_visits, 'visits of an id no account has').to.equal(0);
        expect(year.days, 'active days of an id no account has').to.deep.equal([]);
      });
    });
  });
});
