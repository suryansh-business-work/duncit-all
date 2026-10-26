import type { RunAccount } from '../../support/run-account';
import { CONSOLES, openSignedIn, runPasswordNow, storedToken } from '../../support/ui-shell';
import {
  PORTAL_REFUSED,
  apiLoginRaw,
  deniedBanner,
  expectDeniedBanner,
  expectRefused,
  expectUiLoginRefused,
  grantRoles,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';

/**
 * Portal Shell › Auth (session & gates): a role taken away while a console is
 * open ends that console's session on the next load — AppShell sees `me`
 * without the console's role, drops the token and replaces the URL with
 * /login?denied=1, whose banner names the console.
 *
 * Run once per console CI serves, each with the one grantable role that opens
 * it, granted for the scenario and revoked inside it. Products and the
 * E-commerce console have no grantable role (PRODUCTS_MANAGER /
 * ECOMM_STORE_MANAGER), so for those the refusal is proven at the sign-in.
 * `after()` hands the account back with the three portal roles and nothing else.
 */

const GRANTED = CONSOLES.flatMap((c) => (c.role ? [{ ...c, role: c.role }] : []));
const UNGRANTABLE = CONSOLES.filter((c) => c.role === null);

describe('Portal Shell · Auth (session & gates) (every console, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    // Start from a member who opens none of the consoles below.
    revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
  });

  after(() => {
    if (account) restoreStaffRoles(account);
  });

  GRANTED.forEach((target, index) => {
    it(`ASG-${String(index + 1).padStart(2, '0')} ${target.fullName}: the role revoked mid-session sends the open console to the denied banner`, () => {
      grantRoles(account, [target.role]);
      cy.apiPortalLogin(target.portal, account.email, runPasswordNow(account));
      openSignedIn(target.portal, '/');
      revokeRoles(account, [target.role]);
      cy.reload();
      cy.location('pathname').should('eq', '/login');
      cy.location('search').should('eq', '?denied=1');
      cy.byTestId('login-error').should('have.text', deniedBanner(target.fullName));
      storedToken(target.portal).should('equal', null);
      // And the account can no longer open it at all.
      apiLoginRaw(target.portal, account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    });
  });

  UNGRANTABLE.forEach((target, index) => {
    it(`ASG-${String(GRANTED.length + index + 1).padStart(2, '0')} ${target.fullName}: a staff account without its role is refused at sign-in and shown the denied banner`, () => {
      grantRoles(account, ['SUPPORT_MANAGER']);
      expectUiLoginRefused(target.portal, account);
      apiLoginRaw(target.portal, account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
      expectDeniedBanner(target.portal, target.fullName);
      revokeRoles(account, ['SUPPORT_MANAGER']);
    });
  });
});
