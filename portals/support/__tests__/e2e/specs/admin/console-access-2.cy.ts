import type { E2eStaffRole } from '@duncit/utils';
import { openLogin } from '../../support/login-page';
import { portalTokenKey } from '../../support/portals';
import type { RunAccount } from '../../support/run-account';
import {
  PORTAL_REFUSED,
  apiLoginRaw,
  expectRefused,
  grantRoles,
  revokeRoles,
  staffAccount,
} from '../../support/ui-staff';
import {
  ADMIN_DENIED_BANNER,
  cityAdminSeat,
  expectAdminUiLoginRefused,
  releaseAdminRoles,
} from '../../support/ui-admin-2';

/**
 * Admin › Console access: who may sign in to admin.duncit.com.
 *
 * `appConfig.requiredRoles` and the server's PORTAL_ROLE_REQUIREMENTS.admin
 * agree on SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and
 * FINANCE_USER. The run account starts with the Support, Legal and Pods
 * roles — none of them an admin role — and is refused; then each admin role
 * a run account may hold is granted alone and admitted. FINANCE_MANAGER and
 * TECH_MANAGER are never granted to a run account, so their refusal is not run
 * here (the refusal path is the same one proven first).
 */

const ADMIN_ROLES: readonly E2eStaffRole[] = ['SUPPORT_USER', 'ZONAL_ADMIN', 'FINANCE_USER'];

function expectAdmitted(account: RunAccount, role: string): void {
  apiLoginRaw('admin', account).then((body) => {
    expect(body.errors, `${role} signs in to Admin`).to.be.undefined;
    expect(body.data?.login?.token, `${role} gets a session`).to.be.a('string').and.not.be.empty;
  });
}

describe('Admin · Console access (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    releaseAdminRoles(account, ['CITY_ADMIN', ...ADMIN_ROLES]);
  });

  it('CAC-01 an account holding only other consoles’ roles is refused at the Admin sign-in', () => {
    apiLoginRaw('admin', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectAdminUiLoginRefused(account);
  });

  it('CAC-02 /login?denied=1 says the account has no access to Duncit Admin', () => {
    cy.clearAuth();
    cy.visitPortal('admin', '/login?denied=1');
    cy.byTestId('login-error').should('have.text', ADMIN_DENIED_BANNER);
  });

  it('CAC-03 Support Agent, Zonal Admin and Finance Analyst are each admitted on their own', () => {
    for (const role of ADMIN_ROLES) {
      grantRoles(account, [role]);
      expectAdmitted(account, role);
      revokeRoles(account, [role]);
    }
    apiLoginRaw('admin', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
  });

  it('CAC-04 a City Admin signs in on the screen and lands inside the console', () => {
    cityAdminSeat().then(() => {
      openLogin('admin');
      cy.byTestId('field-email').clear().type(account.email);
      cy.byTestId('field-password').clear().type(account.password('CHANGED'), { log: false });
      cy.interceptOperation('AdminLogin');
      cy.byTestId('login-submit').click();
      cy.wait('@AdminLogin').its('response.body.errors').should('be.undefined');
      cy.location('pathname').should('eq', '/hub');
      cy.byTestId('shell-user-menu-button').should('be.visible');
      cy.window().its('localStorage').invoke('getItem', portalTokenKey('admin')).should('be.a', 'string');
    });
  });
});
