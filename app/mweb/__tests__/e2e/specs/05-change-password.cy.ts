/// <reference types="cypress" />
import {
  expectPasswordRefused,
  fill,
  sendAndReadCode,
  sendCode,
  sessionUser,
  signInWithPassword,
  wrongCode,
} from '../support/account-steps';
import { runAccount } from '../support/run-account';

/**
 * 05 — Change password, live: RECOVERED → CHANGED.
 *
 * CP-01..CP-09 are one dialog on one page, in order: each step picks up the
 * code and the boxes the step before left behind.
 */

const passwordDialog = () => cy.byTestId('change-password-dialog');
const requestButton = () => cy.byTestId('current-password-submit');
const updateButton = () => cy.byTestId('new-password-submit');
const newPasswordError = () => cy.byTestId('new-password-error');

/** Step two's three boxes: the emailed code and the new password twice. */
function fillNewPassword(code: string, password: string, confirmation = password): void {
  fill('field-otp', code);
  fill('field-new_password', password, { log: false });
  fill('field-confirm_password', confirmation, { log: false });
}

function submitNewPassword(): void {
  sendCode('ChangePasswordWithOtp', () => {
    updateButton().click();
  });
}

describe('05 Change password', { testIsolation: false }, () => {
  const account = runAccount();
  const current = account.password('RECOVERED');
  const next = account.password('CHANGED');
  const emailTarget = { email: account.email };
  let otherSession = '';
  let firstCode = '';
  let newestCode = '';

  it('CP-01 the Password card offers Change password', () => {
    // Also the "other" session CP-10 checks: opened before the change.
    cy.apiLogin(account.email, current).then((token) => {
      otherSession = token;
    });
    cy.visitApp('/account');
    cy.byTestId('security-section').should('contain.text', 'Change your password with an email verification code.');
    cy.byTestId('open-change-password').should('contain.text', 'Change password').and('be.enabled');
  });

  it('CP-02 an empty current password is refused', () => {
    cy.byTestId('open-change-password').click();
    passwordDialog().should('be.visible');
    requestButton().click();
    cy.byTestId('current_password-error').should('have.text', 'Enter your current password');
  });

  it('CP-03 a wrong current password is refused', () => {
    cy.byTestId('field-current_password').type(`${current}-wrong`, { log: false });
    sendCode('RequestPasswordChangeOtp', () => {
      requestButton().click();
    });
    cy.byTestId('current-password-error').should('contain.text', 'Current password is incorrect');
  });

  it('CP-04 the right one sends a code to the email', () => {
    fill('field-current_password', current, { log: false });
    sendAndReadCode('PASSWORD_CHANGE', emailTarget, 'RequestPasswordChangeOtp', () => {
      requestButton().click();
    }).then((code) => {
      firstCode = code;
    });
    cy.byTestId('change-password-info').should('contain.text', 'OTP sent to your email.');
  });

  it('CP-05 a wrong code is refused', () => {
    fillNewPassword(wrongCode(firstCode), next);
    submitNewPassword();
    newPasswordError().should('contain.text', 'Invalid OTP');
  });

  it('CP-06 the current password is refused as the new one', () => {
    fillNewPassword(firstCode, current);
    updateButton().click();
    newPasswordError().should('contain.text', 'New password must be different from your current password');
  });

  it('CP-07 the new pair needs 8 characters and must match', () => {
    fillNewPassword(firstCode, 'short');
    updateButton().click();
    cy.byTestId('new_password-error').should('have.text', 'Min 8 characters');
    fillNewPassword(firstCode, next, current);
    updateButton().click();
    cy.byTestId('confirm_password-error').should('have.text', 'Passwords do not match');
  });

  it('CP-08 Resend OTP makes the older code fail', () => {
    sendAndReadCode('PASSWORD_CHANGE', emailTarget, 'RequestPasswordChangeOtp', () => {
      cy.byTestId('change-password-resend').should('have.text', 'Resend OTP').click();
    }).then((code) => {
      newestCode = code;
    });
    fillNewPassword(firstCode, next);
    submitNewPassword();
    newPasswordError().should('contain.text', 'Invalid OTP');
  });

  it('CP-09 the newest code changes it; the old password is refused and the CHANGED one signs in', () => {
    fillNewPassword(newestCode, next);
    submitNewPassword();
    cy.byTestId('security-toast').should('contain.text', 'Password updated');
    passwordDialog().should('not.exist');
    signInWithPassword(account.email, current);
    expectPasswordRefused();
    signInWithPassword(account.email, next);
    cy.location('pathname').should('eq', '/');
  });

  it('CP-10 another signed-in session stays signed in', () => {
    expect(otherSession, 'the session CP-01 opened').to.not.be.empty;
    sessionUser(otherSession).then((data) => {
      expect(data.me?.email.toLowerCase(), 'me for the pre-change token').to.equal(account.email.toLowerCase());
    });
  });
});
