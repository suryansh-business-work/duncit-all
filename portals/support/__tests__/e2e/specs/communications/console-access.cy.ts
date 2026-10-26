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
 * Communications › Console access: who may sign in to communications.duncit.com.
 *
 * Communications admits COMMUNICATIONS_MANAGER (`appConfig.requiredRoles` and
 * PORTAL_ROLE_REQUIREMENTS.communications agree), SUPER_ADMIN passing every
 * portal. MARKETING_MANAGER and TECH_MANAGER are never granted to the run
 * account, so "another staff role is refused" is proven with the three portal
 * roles it holds, then with none.
 */

describe('Communications · Console access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreStaffRoles(account, ['COMMUNICATIONS_MANAGER']);
  });

  it('MCA-01 an account holding other staff roles but not COMMUNICATIONS_MANAGER is refused at the sign-in', () => {
    expectUiLoginRefused('communications', account);
    apiLoginRaw('communications', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
  });

  it('MCA-02 a plain member (no staff role at all) is refused as well', () => {
    revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
    apiLoginRaw('communications', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectUiLoginRefused('communications', account);
  });

  it('MCA-03 /login?denied=1 says the account has no access to Duncit Communications', () => {
    expectDeniedBanner('communications', 'Duncit Communications');
  });

  it('MCA-04 given COMMUNICATIONS_MANAGER, the account signs in and lands on the dashboard', () => {
    grantRoles(account, ['COMMUNICATIONS_MANAGER']);
    openLogin('communications');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('communications');
  });
});
