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
 * Logs › Console access: who may sign in to logs.duncit.com.
 *
 * Logs admits LOGS_MANAGER (`appConfig.requiredRoles` and
 * PORTAL_ROLE_REQUIREMENTS.logs agree), SUPER_ADMIN passing every portal.
 * TECH_MANAGER and FINANCE_MANAGER are never granted to the run account, so
 * "another staff role is refused" is proven with the three portal roles it
 * holds (Support, Legal, Pods), then with none.
 */

describe('Logs · Console access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['LOGS_MANAGER']);
  });

  it('LGA-01 an account holding other staff roles but not LOGS_MANAGER is refused at the Logs sign-in', () => {
    expectUiLoginRefused('logs', account);
    apiLoginRaw('logs', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
  });

  it('LGA-02 a plain member (no staff role at all) is refused as well', () => {
    revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
    apiLoginRaw('logs', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('logs', account);
  });

  it('LGA-03 /login?denied=1 says the account has no access to Duncit Logs', () => {
    expectDeniedBanner('logs', 'Duncit Logs');
  });

  it('LGA-04 given LOGS_MANAGER, the account signs in and lands on the Logs dashboard', () => {
    grantRoles(account, ['LOGS_MANAGER']);
    openLogin('logs');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('logs');
  });
});
