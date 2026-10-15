import { assertInsideShell, openLogin, submitPassword } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
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
 * CRM › Console access: who may sign in to crm.duncit.com.
 *
 * CRM admits CRM_MANAGER (`appConfig.requiredRoles` and
 * PORTAL_ROLE_REQUIREMENTS.crm agree), SUPER_ADMIN passing every portal. The
 * run account holds SUPPORT_MANAGER (with Legal and Pods) for the "another
 * staff role" refusal, SUPPORT_USER is granted for the Support Agent refusal,
 * and with nothing for the plain member. Signed in, the dashboard reads every
 * venue and host lead.
 */

describe('CRM · Console access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['SUPPORT_USER', 'CRM_MANAGER']);
  });

  it('CCA-01 an account holding other staff roles but not CRM_MANAGER is refused at the CRM sign-in', () => {
    expectUiLoginRefused('crm', account);
    apiLoginRaw('crm', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
  });

  it('CCA-02 a Support Agent only (SUPPORT_USER) is refused, and so is a plain member', () => {
    revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
    grantRoles(account, ['SUPPORT_USER']);
    apiLoginRaw('crm', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    revokeRoles(account, ['SUPPORT_USER']);
    apiLoginRaw('crm', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('crm', account);
  });

  it('CCA-03 /login?denied=1 says the account has no access to Duncit CRM', () => {
    expectDeniedBanner('crm', 'Duncit CRM');
  });

  it('CCA-04 given CRM_MANAGER, the account lands on the dashboard, which reads every venue and host lead', () => {
    grantRoles(account, ['CRM_MANAGER']);
    cy.interceptOperation('VenueLeads');
    cy.interceptOperation('HostLeads');
    openLogin('crm');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('crm');
    cy.wait('@VenueLeads').its('response.body.errors').should('be.undefined');
    cy.wait('@HostLeads').its('response.body.errors').should('be.undefined');
  });
});
