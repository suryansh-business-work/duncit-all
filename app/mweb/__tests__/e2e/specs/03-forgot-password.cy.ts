/// <reference types="cypress" />
import {
  expectNoAccount,
  expectNoTestCode,
  expectPasswordRefused,
  fill,
  openPasswordStep,
  openSignedOut,
  pressSendCode,
  sendAndReadCode,
  sendCode,
  sessionUser,
  signInWithPassword,
  waitOutResendCooldown,
  wrongCode,
} from '../support/account-steps';
import { runAccount } from '../support/run-account';

/**
 * 03 — Forgot password, live: SIGNUP → RECOVERED.
 *
 * FP-01..FP-08 are ONE recovery on one page, in order: the server allows one
 * code per 30 seconds, so a scenario that reloaded would be refused a code.
 */

const screen = () => cy.byTestId('forgot-password-screen');
const recoveryError = () => cy.byTestId('recovery-error');
const sendButton = () => cy.byTestId('recovery-send-code');
const savePassword = () => cy.byTestId('recovery-save-password');

function typeNewPassword(password: string, confirmation = password): void {
  fill('field-new_password', password, { log: false });
  fill('field-confirm_password', confirmation, { log: false });
}

function verifyResetCode(code: string): void {
  fill('field-otp', code);
  sendCode('VerifyPasswordResetCode', () => {
    cy.byTestId('recovery-verify-code').should('contain.text', 'Verify code').and('be.enabled').click();
  });
}

describe('03 Forgot password', { testIsolation: false }, () => {
  const account = runAccount();
  const emailTarget = { email: account.email };
  let sessionBeforeReset = '';
  let resetCode = '';
  let codeSentAt = 0;

  it('FP-01 Forgot password? opens the reset, and Send code waits for a valid email', () => {
    // A session opened before the reset, which FP-10 expects to be closed by it.
    cy.apiLogin(account.email, account.password('SIGNUP')).then((token) => {
      sessionBeforeReset = token;
    });
    openSignedOut('/login');
    openPasswordStep();
    cy.byTestId('go-forgot-password').should('have.text', 'Forgot password?').click();
    cy.location('pathname').should('eq', '/forgot-password');
    screen().should('contain.text', 'Forgot password?');
    cy.byTestId('field-email').type('riya@');
    sendButton().should('be.disabled');
    fill('field-email', `nobody-${account.stamp}@example.invalid`);
    sendButton().should('be.enabled');
  });

  it('FP-02 an unknown address is told there is no account, with Create Account', () => {
    sendCode('RequestPasswordResetCode', pressSendCode);
    expectNoAccount();
  });

  it('FP-03 Send code moves to Enter your code, with no test code', () => {
    fill('field-email', account.email);
    sendAndReadCode('PASSWORD_RESET', emailTarget, 'RequestPasswordResetCode', pressSendCode).then((code) => {
      resetCode = code;
      codeSentAt = Date.now();
    });
    screen().should('contain.text', 'Enter your code');
    expectNoTestCode('recovery-test-code');
  });

  it('FP-04 a wrong code is refused with the attempts left', () => {
    verifyResetCode(wrongCode(resetCode));
    recoveryError().should('contain.text', 'Incorrect code — 4 attempts left');
  });

  it('FP-05 Back, then Send code inside 30 seconds, is refused', () => {
    cy.byTestId('recovery-back').should('contain.text', 'Back').click();
    cy.byTestId('field-email').should('have.value', account.email);
    sendCode('RequestPasswordResetCode', pressSendCode);
    recoveryError().invoke('text').should('match', /^Wait \d+s before asking for another code$/);
  });

  it('FP-06 the code opens Create a new password, which will not save a short or mismatched pair', () => {
    // A real clock: the server will not send another code until 30 s after the last.
    waitOutResendCooldown(codeSentAt);
    sendAndReadCode('PASSWORD_RESET', emailTarget, 'RequestPasswordResetCode', pressSendCode).then(verifyResetCode);
    screen().should('contain.text', 'Create a new password');
    savePassword().should('be.disabled');
    typeNewPassword('short');
    cy.byTestId('new_password-error').should('have.text', 'Min 8 characters');
    savePassword().should('be.disabled');
    typeNewPassword(account.password('RECOVERED'), account.password('CHANGED'));
    cy.byTestId('confirm_password-error').should('have.text', 'Passwords do not match');
    savePassword().should('be.disabled');
  });

  it('FP-07 the current password is refused as a new one', () => {
    typeNewPassword(account.password('SIGNUP'));
    sendCode('CompletePasswordReset', () => {
      savePassword().should('be.enabled').click();
    });
    recoveryError().should('contain.text', 'Choose a password you have not used on this account before');
  });

  it('FP-08 the RECOVERED password is saved', () => {
    typeNewPassword(account.password('RECOVERED'));
    sendCode('CompletePasswordReset', () => {
      savePassword().should('be.enabled').click();
    });
    cy.byTestId('recovery-success').should('contain.text', 'Password changed successfully');
    cy.byTestId('recovery-go-login').should('contain.text', 'Continue to Login').and('have.attr', 'href', '/login');
  });

  it('FP-09 the old password is refused and the RECOVERED one signs in', () => {
    cy.byTestId('recovery-go-login').click();
    cy.location('pathname').should('eq', '/login');
    signInWithPassword(account.email, account.password('SIGNUP'));
    expectPasswordRefused();
    signInWithPassword(account.email, account.password('RECOVERED'));
    cy.location('pathname').should('eq', '/');
  });

  it('FP-10 a session opened before the reset is signed out', () => {
    expect(sessionBeforeReset, 'the session FP-01 opened').to.not.be.empty;
    // The server no longer knows who the old token belongs to.
    sessionUser(sessionBeforeReset).then((data) => {
      expect(data.me, 'me for the pre-reset token').to.be.null;
    });
  });
});
