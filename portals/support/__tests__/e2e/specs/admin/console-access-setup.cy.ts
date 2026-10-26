import { openLogin } from '../../support/login-page';
import { portalTokenKey } from '../../support/portals';
import {
  ADMIN_FULL_NAME,
  adminRun,
  releaseAdmin,
  signInAdmin,
  switchAdminRoles,
  type AdminRun,
} from '../../support/ui-admin-1';
import {
  PORTAL_REFUSED,
  apiLoginRaw,
  countOperation,
  expectDeniedBanner,
  expectNotSent,
  expectRefused,
} from '../../support/ui-staff';

/**
 * Admin › Console Access & Setup: who may sign in to admin.duncit.com, where
 * its routes lead, and the first-time "Send Credentials to Admin" helper.
 *
 * The sign-in is `AdminLogin` (portals/admin/src/pages/LoginPage.tsx), gated by
 * PORTAL_ROLE_REQUIREMENTS.admin on the server and `appConfig.requiredRoles` in
 * the console. The spec starts the run account with no admin role, then grants
 * one admitted role at a time. The credentials helper emails the seeded super
 * admin, so only its captcha gate is driven: a wrong code never sends.
 */

function uiSignIn(run: AdminRun): void {
  openLogin('admin');
  cy.byTestId('field-email').clear().type(run.account.email);
  cy.byTestId('field-password').clear().type(run.account.password('CHANGED'), { log: false });
  cy.interceptOperation('AdminLogin');
  cy.byTestId('login-submit').click();
}

describe('Admin · Console Access & Setup (run account, password CHANGED)', { testIsolation: false }, () => {
  let run: AdminRun;

  before(() => {
    adminRun([]).then((r) => {
      run = r;
    });
  });

  after(() => releaseAdmin(run));

  it('ACA-01 an account with staff roles but no admin role is refused at the Admin sign-in, on screen and by the API', () => {
    apiLoginRaw('admin', run.account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    uiSignIn(run);
    cy.wait('@AdminLogin').its('response.body.errors.0.message').should('eq', PORTAL_REFUSED);
    cy.byTestId('login-error').should('contain.text', PORTAL_REFUSED);
    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage').invoke('getItem', portalTokenKey('admin')).should('equal', null);
  });

  it('ACA-02 /login?denied=1 names Duncit Admin in the shared access-denied message', () => {
    expectDeniedBanner('admin', ADMIN_FULL_NAME);
  });

  it('ACA-03 a City Admin signs in on the login screen and lands on the Hub with the session stored', () => {
    switchAdminRoles(run, [], ['CITY_ADMIN']);
    uiSignIn(run);
    cy.wait('@AdminLogin').its('response.body.errors').should('be.undefined');
    cy.location('pathname').should('eq', '/hub');
    cy.byTestId('shell-user-menu-button').should('be.visible');
    cy.byTestId('admin-hub-tile-dashboard').should('be.visible');
    cy.window()
      .its('localStorage')
      .invoke('getItem', portalTokenKey('admin'))
      .should('be.a', 'string')
      .and('not.be.empty');
  });

  it('ACA-04 Zonal Admin, Support Agent and Finance User are each admitted on their own', () => {
    const singles = ['ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'] as const;
    let held: (typeof singles)[number] | 'CITY_ADMIN' = 'CITY_ADMIN';
    for (const role of singles) {
      cy.then(() => {
        switchAdminRoles(run, [held], [role]);
        held = role;
      });
      apiLoginRaw('admin', run.account).then((body) => {
        expect(body.errors, `${role} alone opens the Admin console`).to.be.undefined;
        expect(body.data?.login?.token, `${role} gets a token`).to.be.a('string').and.not.be.empty;
      });
    }
    cy.then(() => switchAdminRoles(run, [held], ['CITY_ADMIN']));
  });

  it('ACA-05 unknown and retired routes (Pods and Clubs moved to their own consoles) fall back to the Hub', () => {
    signInAdmin(run);
    for (const path of ['/does-not-exist', '/pods', '/clubs']) {
      cy.visitPortal('admin', path);
      cy.location('pathname').should('eq', '/hub');
      cy.byTestId('admin-hub-tile-users').should('be.visible');
    }
  });

  it('ACA-06 signed out, a deep link is sent to /login carrying the path to return to', () => {
    cy.clearAuth();
    cy.visitPortal('admin', '/does-not-exist');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/does-not-exist')}`);
    cy.byTestId('login-screen').should('be.visible');
  });

  it('ACA-07 the credentials helper is gated by its captcha: empty is disabled, a wrong code is refused with a fresh one, nothing is sent', () => {
    const seeds = countOperation('SeedSuperAdmin');
    openLogin('admin');
    cy.byTestId('send-admin-credentials').should('be.enabled').and('have.text', 'Send Credentials to Admin').click();
    cy.byTestId('send-admin-credentials-dialog').should('be.visible');
    cy.byTestId('send-admin-credentials-send').should('be.disabled');
    cy.byTestId('send-admin-credentials-code')
      .invoke('text')
      .then((code) => {
        expect(code, 'a 5-character code').to.match(/^[A-Z2-9]{5}$/);
        // Every character shifted, so the entry cannot be the code.
        const wrong = [...code].map((c) => (c === 'A' ? 'B' : 'A')).join('');
        cy.byTestId('send-admin-credentials-entry').find('input').type(wrong);
        cy.byTestId('send-admin-credentials-send').should('be.enabled').click();
        cy.byTestId('send-admin-credentials-entry').should('contain.text', 'That does not match. Please try again.');
        cy.byTestId('send-admin-credentials-entry').find('input').should('have.value', '');
        cy.byTestId('send-admin-credentials-code').invoke('text').should('match', /^[A-Z2-9]{5}$/);
        cy.byTestId('send-admin-credentials-send').should('be.disabled');
      });
    cy.byTestId('send-admin-credentials-cancel').click();
    cy.byTestId('send-admin-credentials-dialog').should('not.exist');
    cy.byTestId('send-admin-credentials').should('be.enabled').and('have.text', 'Send Credentials to Admin');
    expectNotSent(seeds, 'SeedSuperAdmin');
  });
});
