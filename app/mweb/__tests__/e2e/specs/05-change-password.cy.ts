/// <reference types="cypress" />
import {
  DIALOG,
  dialogWith,
  PASSWORD_REFUSED,
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

const passwordDialog = () => dialogWith('Change password');
const requestButton = () => cy.get('[data-testid="change-password-request"]');
const updateButton = () => cy.get('[data-testid="change-password-submit"]');

/** Step two's three boxes: the emailed code and the new password twice. */
function fillNewPassword(code: string, password: string, confirmation = password): void {
  passwordDialog().find('input[name="otp"]').clear().type(code);
  passwordDialog().find('input[name="new_password"]').clear().type(password, { log: false });
  passwordDialog().find('input[name="confirm_password"]').clear().type(confirmation, { log: false });
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
    cy.contains('Change your password with an email verification code.').should('be.visible');
    cy.get('[data-testid="open-change-password"]').should('contain.text', 'Change password').and('be.enabled');
  });

  it('CP-02 an empty current password is refused', () => {
    cy.get('[data-testid="open-change-password"]').click();
    requestButton().click();
    cy.contains(DIALOG, 'Enter your current password').should('be.visible');
  });

  it('CP-03 a wrong current password is refused', () => {
    passwordDialog().find('input[name="current_password"]').type(`${current}-wrong`, { log: false });
    sendCode('RequestPasswordChangeOtp', () => {
      requestButton().click();
    });
    cy.contains(DIALOG, 'Current password is incorrect').should('be.visible');
  });

  it('CP-04 the right one sends a code to the email', () => {
    passwordDialog().find('input[name="current_password"]').clear().type(current, { log: false });
    sendAndReadCode('PASSWORD_CHANGE', emailTarget, 'RequestPasswordChangeOtp', () => {
      requestButton().click();
    }).then((code) => {
      firstCode = code;
    });
    cy.contains(DIALOG, 'OTP sent to your email.').should('be.visible');
  });

  it('CP-05 a wrong code is refused', () => {
    fillNewPassword(wrongCode(firstCode), next);
    submitNewPassword();
    cy.contains(DIALOG, 'Invalid OTP').should('be.visible');
  });

  it('CP-06 the current password is refused as the new one', () => {
    fillNewPassword(firstCode, current);
    updateButton().click();
    cy.contains(DIALOG, 'New password must be different from your current password').should('be.visible');
  });

  it('CP-07 the new pair needs 8 characters and must match', () => {
    fillNewPassword(firstCode, 'short');
    updateButton().click();
    cy.contains(DIALOG, 'Min 8 characters').should('be.visible');
    fillNewPassword(firstCode, next, current);
    updateButton().click();
    cy.contains(DIALOG, 'Passwords do not match').should('be.visible');
  });

  it('CP-08 Resend OTP makes the older code fail', () => {
    sendAndReadCode('PASSWORD_CHANGE', emailTarget, 'RequestPasswordChangeOtp', () => {
      passwordDialog().contains('button', 'Resend OTP').click();
    }).then((code) => {
      newestCode = code;
    });
    fillNewPassword(firstCode, next);
    submitNewPassword();
    cy.contains(DIALOG, 'Invalid OTP').should('be.visible');
  });

  it('CP-09 the newest code changes it; the old password is refused and the CHANGED one signs in', () => {
    fillNewPassword(newestCode, next);
    submitNewPassword();
    cy.contains('Password updated').should('be.visible');
    passwordDialog().should('not.exist');
    signInWithPassword(account.email, current);
    cy.contains(PASSWORD_REFUSED).should('be.visible');
    cy.location('pathname').should('eq', '/login');
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
