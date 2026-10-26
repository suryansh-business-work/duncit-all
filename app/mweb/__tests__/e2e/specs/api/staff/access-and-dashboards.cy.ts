/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import {
  asRole,
  call,
  CALLS,
  expectCallsRefused,
  expectRead,
  expectRolesRefused,
  expectTableRead,
} from '../../../support/api-staff';

/**
 * Finance console role gate, staff half. Reads take FINANCE_READ =
 * SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER plus FINANCE_USER, the analyst seat
 * (finance/finance/finance.resolver.ts, middleware/rbac.ts FINANCE_READER);
 * payment tables also admit ZONAL_ADMIN (finance/payment/payment.resolver.ts
 * ADMIN_READ). Scenario map: Staff › Access and dashboards "Role gate for the
 * Finance portal".
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'FINANCE_USER', 'ZONAL_ADMIN', 'SUPPORT_USER'];

const DASHBOARD = call('financeDashboardStats', `query E2eFinanceDashboard { financeDashboardStats { __typename } }`);
const WITHDRAWALS = call(
  'withdrawalRequestsTable',
  `query E2eWithdrawalRequests { withdrawalRequestsTable(query: { page_size: 1 }) { total } }`,
);

describe('API · Finance reads by role', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('FA-01 CITY_ADMIN passes the finance reads: settings, dashboard and payments', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead(token, CALLS.financeSettings);
      expectRead(token, DASHBOARD);
      expectTableRead(token, CALLS.paymentsTable);
    });
  });

  it('FA-02 FINANCE_USER, the analyst seat, reads settings, dashboard, payments and withdrawals', () => {
    asRole('FINANCE_USER', (token) => {
      expectRead(token, CALLS.financeSettings);
      expectRead(token, DASHBOARD);
      expectTableRead(token, CALLS.paymentsTable);
      expectTableRead(token, WITHDRAWALS);
    });
  });

  it('FA-03 ZONAL_ADMIN reads payments but is refused the finance settings and dashboard', () => {
    asRole('ZONAL_ADMIN', (token) => {
      expectTableRead(token, CALLS.paymentsTable);
      expectCallsRefused(token, [CALLS.financeSettings, DASHBOARD, WITHDRAWALS]);
    });
  });

  it('FA-04 SUPPORT_USER is refused every finance read', () => {
    expectRolesRefused(['SUPPORT_USER'], [CALLS.financeSettings, DASHBOARD, CALLS.paymentsTable, WITHDRAWALS]);
  });
});
