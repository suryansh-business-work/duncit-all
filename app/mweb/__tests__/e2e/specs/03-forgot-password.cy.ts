/// <reference types="cypress" />
import {
  NO_ACCOUNT,
  expectNoTestCode,
  PASSWORD_REFUSED,
  openPasswordStep,
  openSignedOut,
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

const emailBox = () => cy.get('input[name="email"]');
const newPasswordBox = () => cy.get('input[name="new_password"]');
const confirmBox = () => cy.get('input[name="confirm_password"]');
const savePassword = () => cy.contains('button', 'Save password');
const pressSendCode = () => {
  cy.contains('button', 'Send code').should('be.enabled').click();
};

function typeNewPassword(password: string, confirmation = password): void {
  newPasswordBox().clear().type(password, { log: false });
  confirmBox().clear().type(confirmation, { log: false });
}

function verifyResetCode(code: string): void {
  cy.get('input[name="otp"]').clear().type(code);
  sendCode('VerifyPasswordResetCode', () => {
    cy.contains('button', 'Verify code').should('be.enabled').click();
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
    cy.contains('a', 'Forgot password?').click();
    cy.location('pathname').should('eq', '/forgot-password');
    cy.contains('h1', 'Forgot password?').should('be.visible');
    emailBox().type('riya@');
    cy.contains('button', 'Send code').should('be.disabled');
    emailBox().clear().type(`nobody-${account.stamp}@example.invalid`);
    cy.contains('button', 'Send code').should('be.enabled');
  });

  it('FP-02 an unknown address is told there is no account, with Create Account', () => {
    sendCode('RequestPasswordResetCode', pressSendCode);
    cy.contains(NO_ACCOUNT).should('be.visible');
    cy.contains('a', 'Create Account').should('have.attr', 'href', '/register');
  });

  it('FP-03 Send code moves to Enter your code, with no test code', () => {
    emailBox().clear().type(account.email);
    sendAndReadCode('PASSWORD_RESET', emailTarget, 'RequestPasswordResetCode', pressSendCode).then((code) => {
      resetCode = code;
      codeSentAt = Date.now();
    });
    cy.contains('h1', 'Enter your code').should('be.visible');
    expectNoTestCode();
  });

  it('FP-04 a wrong code is refused with the attempts left', () => {
    verifyResetCode(wrongCode(resetCode));
    cy.contains('[role="alert"]', 'Incorrect code — 4 attempts left').should('be.visible');
  });

  it('FP-05 Back, then Send code inside 30 seconds, is refused', () => {
    cy.contains('button', /^Back$/).click();
    emailBox().should('have.value', account.email);
    sendCode('RequestPasswordResetCode', pressSendCode);
    cy.contains('[role="alert"]', /^Wait \d+s before asking for another code$/).should('be.visible');
  });

  it('FP-06 the code opens Create a new password, which will not save a short or mismatched pair', () => {
    // A real clock: the server will not send another code until 30 s after the last.
    waitOutResendCooldown(codeSentAt);
    sendAndReadCode('PASSWORD_RESET', emailTarget, 'RequestPasswordResetCode', pressSendCode).then(verifyResetCode);
    cy.contains('h1', 'Create a new password').should('be.visible');
    savePassword().should('be.disabled');
    typeNewPassword('short');
    cy.contains('Min 8 characters').should('be.visible');
    savePassword().should('be.disabled');
    typeNewPassword(account.password('RECOVERED'), account.password('CHANGED'));
    cy.contains('Passwords do not match').should('be.visible');
    savePassword().should('be.disabled');
  });

  it('FP-07 the current password is refused as a new one', () => {
    typeNewPassword(account.password('SIGNUP'));
    sendCode('CompletePasswordReset', () => {
      savePassword().should('be.enabled').click();
    });
    cy.contains('[role="alert"]', 'Choose a password you have not used on this account before').should('be.visible');
  });

  it('FP-08 the RECOVERED password is saved', () => {
    typeNewPassword(account.password('RECOVERED'));
    sendCode('CompletePasswordReset', () => {
      savePassword().should('be.enabled').click();
    });
    cy.get('[data-testid="recovery-success"]').should('contain.text', 'Password changed successfully');
    cy.contains('a', 'Continue to Login').should('have.attr', 'href', '/login');
  });

  it('FP-09 the old password is refused and the RECOVERED one signs in', () => {
    cy.contains('a', 'Continue to Login').click();
    cy.location('pathname').should('eq', '/login');
    signInWithPassword(account.email, account.password('SIGNUP'));
    cy.contains(PASSWORD_REFUSED).should('be.visible');
    cy.location('pathname').should('eq', '/login');
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
