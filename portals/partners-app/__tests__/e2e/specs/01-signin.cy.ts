import { loginPage, openLogin, requestPortalCode, submitPassword, submitPortalCode } from '../support/login-page';
import { LOGIN_MUTATION } from '../support/operations';
import { runAccount, type RunAccount } from '../support/run-account';

/**
 * Partners sign-in, with the account the mWeb suite created (password CHANGED).
 *
 * The two code scenarios need no wait between them: a portal code is spent the
 * moment it is tried — right or wrong — so SI-P4's successful sign-in leaves no
 * live code, and SI-P5's request is issued at once instead of meeting the
 * one-code-in-flight cooldown.
 */

const LANDING = '/earn';

/** Six digits that are certainly not `code`: every digit moved by one. */
const wrongCodeFor = (code: string): string =>
  [...code].map((digit) => String((Number(digit) + 1) % 10)).join('');

describe('Partners · sign in (mWeb account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = runAccount();
  });

  it('SI-P1 an empty submit shows E-mail address is required and Password is required', () => {
    openLogin();
    loginPage.submit().click();
    cy.contains('E-mail address is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('SI-P2 a wrong password shows Invalid email or password', () => {
    openLogin();
    submitPassword(account.email, `${account.password('CHANGED')}-wrong`);
    loginPage.alert('Invalid email or password').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('SI-P3 the run account signs in and lands on /earn', () => {
    openLogin();
    submitPassword(account.email, account.password('CHANGED'));
    cy.location('pathname').should('eq', LANDING);
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.a', 'string').and('not.be.empty');
  });

  it('SI-P4 Login with OTP › Email me a code, then the PORTAL_LOGIN code and Sign in land on /earn', () => {
    openLogin();
    requestPortalCode(account.email).then((code) => {
      submitPortalCode(code);
    });
    cy.location('pathname').should('eq', LANDING);
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.a', 'string').and('not.be.empty');
  });

  it('SI-P5 a wrong portal code shows Invalid or expired code', () => {
    openLogin();
    requestPortalCode(account.email).then((code) => {
      submitPortalCode(wrongCodeFor(code));
    });
    loginPage.alert('Invalid or expired code').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('SI-P6 Forgot password? shows Contact your administrator to reset your password.', () => {
    openLogin();
    cy.contains('button', 'Forgot password?').click();
    cy.contains('Contact your administrator to reset your password.').should('be.visible');
  });

  it('SI-P7 the Tech portal refuses the same account with You do not have access to this portal', () => {
    cy.gqlError(
      LOGIN_MUTATION,
      { input: { email: account.email, password: account.password('CHANGED'), portal_key: 'tech' } },
      { token: null },
    ).should('eq', 'You do not have access to this portal');
  });
});
