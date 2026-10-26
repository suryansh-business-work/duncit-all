import { submitPassword } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import {
  openSignedIn,
  restoreRunPassword,
  runPasswordNow,
  temporaryPassword,
} from '../../support/ui-shell';
import { LOGIN_MUTATION } from '../../support/operations';
import { expectConfirm, gqlRaw, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Account security (Profile › Security), on Support:
 *
 * - Change password: current password → an emailed code (held by the e2e API
 *   as PASSWORD_CHANGE) → the new password; afterwards the old one is refused
 *   and the new one signs in. The account is moved to a temporary password for
 *   the scenario and `after()` moves it back to the run password through the
 *   same two server steps.
 * - Sign out everywhere: every token issued before the click is sealed,
 *   another session included; a new sign-in (a second later — tokens are
 *   stamped to the second) opens a fresh one.
 */

const ME = `query E2eSessionMe { me { user_id } }`;

describe('Portal Shell · Account security (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  after(() => {
    if (account) restoreRunPassword('support', account);
  });

  it('AS-01 the password changes with the emailed code; the old one no longer signs in', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/profile?selectedtab=security');
    cy.byTestId('profile-change-password').click();
    cy.byTestId('change-password-dialog').should('contain.text', 'Change password');
    cy.byTestId('change-password-current').find('input').type(runPasswordNow(account), { log: false });
    cy.lastOtpIssuedAt('PASSWORD_CHANGE', { email: account.email }).then((before) => {
      cy.interceptOperation('ShellRequestPasswordChangeOtp');
      cy.byTestId('current-password-submit').click();
      cy.wait('@ShellRequestPasswordChangeOtp').its('response.body.errors').should('be.undefined');
      cy.byTestId('change-password-notice').should('have.text', 'We have emailed you a 6-digit code.');
      cy.readOtp('PASSWORD_CHANGE', { email: account.email }, before).then((otp) => {
        cy.byTestId('change-password-otp').find('input').type(otp, { log: false });
        cy.byTestId('change-password-new').find('input').type(temporaryPassword(account), { log: false });
        cy.byTestId('change-password-confirm').find('input').type(temporaryPassword(account), { log: false });
        cy.interceptOperation('ShellChangePasswordWithOtp');
        cy.byTestId('new-password-submit').click();
        cy.wait('@ShellChangePasswordWithOtp').its('response.body.data.changePasswordWithOtp').should('eq', true);
      });
    });
    cy.byTestId('change-password-dialog').should('not.exist');
    cy.byTestId('profile-password-changed').should('have.text', 'Your password has been changed.');

    const login = (password: string) =>
      gqlRaw<{ login: { token: string } | null }>(
        'support',
        LOGIN_MUTATION,
        { input: { email: account.email, password, portal_key: 'support' } },
        null,
      );
    login(runPasswordNow(account)).then((body) => {
      expect(body.errors?.[0]?.message, 'the old password').to.equal('Invalid email or password');
    });
    login(temporaryPassword(account)).then((body) => {
      expect(body.data?.login?.token, 'the new password').to.be.a('string');
    });
    restoreRunPassword('support', account);
    login(runPasswordNow(account)).then((body) => expect(body.data?.login?.token, 'back on the run password').to.be.a('string'));
  });

  it('AS-02 Sign out of all devices ends this session and every other one; a new sign-in works', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account)).then((other) => {
      // The session this page will use, opened after the "other device".
      cy.wait(1100);
      cy.apiPortalLogin('support', account.email, runPasswordNow(account));
      openSignedIn('support', '/profile?selectedtab=security');
      cy.byTestId('profile-sign-out-all').click();
      expectConfirm('Sign out of all devices?');
      cy.interceptOperation('ShellSignOutEverywhere');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@ShellSignOutEverywhere').its('response.body.data.signOutEverywhere').should('eq', true);
      cy.location('pathname').should('eq', '/login');
      gqlRaw<{ me: unknown }>('support', ME, {}, other).then((body) => {
        expect(body.data?.me ?? null, 'the other device is signed out').to.equal(null);
      });
    });
    cy.wait(1100);
    cy.clearAuth();
    cy.visitPortal('support', '/login');
    submitPassword(account.email, runPasswordNow(account));
    cy.location('pathname').should('eq', '/');
    cy.byTestId('shell-user-menu-button').should('be.visible');
  });
});
