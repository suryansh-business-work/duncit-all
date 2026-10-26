import { assertInsideShell, openLogin, submitPassword } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import { ZERO_ID, apiRead, expectApiRefused } from '../../support/ui-finance-crm';
import {
  PORTAL_REFUSED,
  apiLoginRaw,
  expectDeniedBanner,
  expectRefused,
  expectUiLoginRefused,
  grantRoles,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';

/**
 * Finance › Console access: who may sign in to finance.duncit.com.
 *
 * Finance admits FINANCE_MANAGER and the analyst seat FINANCE_USER
 * (`appConfig.requiredRoles` and PORTAL_ROLE_REQUIREMENTS.finance in
 * server/src/modules/portals/portal.constants.ts agree), SUPER_ADMIN passing
 * every portal. The catalogue row lists FINANCE_USER among the refused roles;
 * the code says otherwise — the analyst signs in and reads, and every write
 * stays refused — so that is what this spec proves. FINANCE_MANAGER and
 * SUPER_ADMIN are never granted to the run account.
 */

const DASHBOARD_STATS = `query E2eFinanceDashboardStats {
  financeDashboardStats { currency_symbol total_revenue { total } }
}`;

const UPDATE_FINANCE_SETTINGS = `mutation E2eUpdateFinanceSettings($input: UpdateFinanceSettingsInput!) {
  updateFinanceSettings(input: $input) { currency_symbol }
}`;

const REFUND_PAYMENT = `mutation E2eRefundPayment($id: ID!) {
  refundPayment(payment_doc_id: $id) { id }
}`;

describe('Finance · Console access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['FINANCE_USER']);
  });

  it('FCA-01 an account holding other staff roles but no finance role is refused at the Finance sign-in', () => {
    expectUiLoginRefused('finance', account);
    apiLoginRaw('finance', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
  });

  it('FCA-02 a plain member (no staff role at all) is refused as well', () => {
    revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
    apiLoginRaw('finance', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('finance', account);
  });

  it('FCA-03 /login?denied=1 says the account has no access to Duncit Finance', () => {
    expectDeniedBanner('finance', 'Duncit Finance');
  });

  it('FCA-04 the analyst seat (FINANCE_USER) signs in and lands on the Finance dashboard', () => {
    grantRoles(account, ['FINANCE_USER']);
    openLogin('finance');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('finance');
    cy.byTestId('finance-kpi-total_revenue').should('be.visible');
  });

  it('FCA-05 the analyst reads the finance figures but is refused every money write', () => {
    apiRead<{ financeDashboardStats: { currency_symbol: string } }>('finance', account, DASHBOARD_STATS)
      .its('financeDashboardStats.currency_symbol')
      .should('be.a', 'string');
    // Empty input and an id no payment carries: a gate that let these through could change nothing.
    expectApiRefused('finance', account, UPDATE_FINANCE_SETTINGS, { input: {} }, 'updateFinanceSettings');
    expectApiRefused('finance', account, REFUND_PAYMENT, { id: ZERO_ID }, 'refundPayment');
  });
});
