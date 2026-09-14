import { openLogin, requestPortalCode, submitPassword, submitPortalCode } from '../support/login-page';
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
    cy.byTestId('login-submit').click();
    cy.byTestId('email-error').should('be.visible').and('contain.text', 'E-mail address is required');
    cy.byTestId('password-error').should('be.visible').and('contain.text', 'Password is required');
    cy.location('pathname').should('eq', '/login');
  });

  it('SI-P2 a wrong password shows Invalid email or password', () => {
    openLogin();
    submitPassword(account.email, `${account.password('CHANGED')}-wrong`);
    cy.byTestId('login-error').should('be.visible').and('contain.text', 'Invalid email or password');
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
    cy.byTestId('otp-login-error').should('be.visible').and('contain.text', 'Invalid or expired code');
    cy.location('pathname').should('eq', '/login');
  });

  it('SI-P6 Forgot password? shows Contact your administrator to reset your password.', () => {
    openLogin();
    cy.byTestId('go-forgot-password').should('contain.text', 'Forgot password?').click();
    cy.byTestId('login-snackbar')
      .should('be.visible')
      .and('contain.text', 'Contact your administrator to reset your password.');
  });

  it('SI-P7 the Tech portal refuses the same account with You do not have access to this portal', () => {
    cy.gqlError(
      LOGIN_MUTATION,
      { input: { email: account.email, password: account.password('CHANGED'), portal_key: 'tech' } },
      { token: null },
    ).should('eq', 'You do not have access to this portal');
  });
});
