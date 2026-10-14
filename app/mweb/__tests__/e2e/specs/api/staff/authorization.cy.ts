/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, CALLS, expectCallsRefused, expectRead } from '../../../support/api-staff';

/**
 * Staff › Authorization — two role-matrix rows.
 *
 * "FINANCE_USER (Finance Analyst) cannot … call finance resolvers": the code
 * makes FINANCE_USER the read-only analyst seat (middleware/rbac.ts
 * FINANCE_READER is added to the finance READ gates — see
 * access-and-dashboards.cy.ts FA-02), so what is asserted here is the other
 * half: no finance WRITE admits it.
 *
 * "CITY_ADMIN … cannot read entity analytics": entityAnalytics admits
 * SUPER_ADMIN and ANALYTICS_MANAGER, plus CITY_ADMIN, ZONAL_ADMIN and
 * SUPPORT_USER for the USERS page only and LOGS_MANAGER for the LOGS page only
 * (platform/analytics/entity/entityAnalytics.resolver.ts entityReaders).
 */

const ROLES: readonly E2eStaffRole[] = ['FINANCE_USER', 'CITY_ADMIN', 'SUPPORT_USER', 'LOGS_MANAGER'];

const FINANCE_WRITES = [
  call('updateFinanceSettings', `mutation E2eUpdateFinanceSettings { updateFinanceSettings(input: {}) { __typename } }`),
  call('updateCoinSettings', `mutation E2eUpdateCoinSettings { updateCoinSettings(input: {}) { __typename } }`),
  CALLS.refundPayment,
  CALLS.approvePodPaymentRelease,
  CALLS.reviewWithdrawal,
];

const entity = (name: string) =>
  call(
    'entityAnalytics',
    `query E2eEntityAnalytics($entity: AnalyticsEntity!) { entityAnalytics(entity: $entity, days: 7) { entity } }`,
    { entity: name },
  );
const CITIES = call('analyticsCities', `query E2eAnalyticsCities { analyticsCities { __typename } }`);

/** `role` reads the one page it is admitted to, and is refused the revenue and pods pages and the city list. */
const readsOnly = (role: E2eStaffRole, page: string) =>
  asRole(role, (token) => {
    expectRead<{ entity: string }>(token, entity(page)).then((analytics) => {
      expect(analytics.entity, 'the page answered').to.equal(page);
    });
    expectCallsRefused(token, [entity('REVENUE'), entity('PODS'), CITIES]);
  });

describe('API · Finance writes and entity analytics by role', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('AZ-01 FINANCE_USER, the analyst seat, is refused every finance write', () => {
    asRole('FINANCE_USER', (token) => expectCallsRefused(token, FINANCE_WRITES));
  });

  it('AZ-02 CITY_ADMIN reads the Users analytics page but is refused revenue, pods and the city list', () => {
    readsOnly('CITY_ADMIN', 'USERS');
  });

  it('AZ-03 SUPPORT_USER reads the Users analytics page but is refused revenue, pods and the city list', () => {
    readsOnly('SUPPORT_USER', 'USERS');
  });

  it('AZ-04 LOGS_MANAGER reads the Logs analytics page but is refused revenue, pods and the city list', () => {
    readsOnly('LOGS_MANAGER', 'LOGS');
  });
});
