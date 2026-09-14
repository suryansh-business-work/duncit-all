/// <reference types="cypress" />
import {
  expectNoAccount,
  expectPasswordRefused,
  fill,
  openOtpStep,
  openSignedOut,
  sendAndReadCode,
  sendCode,
  sendCodeToEmail,
  signInWithPassword,
  wrongCode,
} from '../support/account-steps';
import { runAccount } from '../support/run-account';

/**
 * 08 — Account deletion, live (stage CHANGED). The last mWeb spec of the
 * account's life, run after the Partners and staff-portal specs have followed
 * what 06 and 07 filed: filing the request seals the account, and `after()`
 * purges it outright so the Google spec (09) and the next surface can sign up
 * with the same number.
 *
 * AD-01..AD-06 are one flow on one page, in order.
 */

const DELETION_SETTINGS_QUERY = `query E2eAccountDeletionSettings {
  accountDeletionSettings { retention_days }
}`;

const confirmDialog = () => cy.byTestId('confirm-dialog');
const codeDialog = () => cy.byTestId('delete-account-dialog');
const submitButton = () => cy.byTestId('delete-account-submit');
const deletionError = () => cy.byTestId('delete-account-error');

/** The warning names the window when the server has one; without one it only says it cannot be undone. */
function confirmCopy(retentionDays: number | null): string {
  if (retentionDays === null) return 'This cannot be undone from the app.';
  return `Your account and everything on it will be deleted ${retentionDays} days from now.`;
}

function submitDeletion(): void {
  sendCode('SubmitAccountDeletionRequest', () => {
    submitButton().click();
  });
}

describe('08 Delete account', { testIsolation: false }, () => {
  const account = runAccount();
  const emailTarget = { email: account.email };
  let retentionDays: number | null = null;
  let issuedBeforeCancel = '';
  let firstCode = '';
  let newestCode = '';

  after(() => {
    cy.purgeRunAccount();
  });

  it('AD-01 Request account deletion warns with the retention days, and Cancel sends nothing', () => {
    cy.apiLogin(account.email, account.password('CHANGED'));
    cy.gql<{ accountDeletionSettings: { retention_days: number | null } }>(DELETION_SETTINGS_QUERY).then((data) => {
      retentionDays = data.accountDeletionSettings.retention_days;
    });
    cy.lastOtpIssuedAt('ACCOUNT_DELETION', emailTarget).then((issuedAt) => {
      issuedBeforeCancel = issuedAt;
    });
    cy.visitApp('/account');
    cy.byTestId('open-delete-account').should('contain.text', 'Request account deletion').click();
    cy.byTestId('confirm-dialog-title').should('have.text', 'Request account deletion?');
    cy.then(() => {
      confirmDialog().should('contain.text', confirmCopy(retentionDays));
    });
    cy.byTestId('confirm-dialog-cancel').should('contain.text', 'Cancel').click();
    confirmDialog().should('not.exist');
    cy.lastOtpIssuedAt('ACCOUNT_DELETION', emailTarget).then((issuedAt) => {
      expect(issuedAt, 'the newest deletion code after Cancel').to.equal(issuedBeforeCancel);
    });
  });

  it('AD-02 Send code opens the code step', () => {
    cy.byTestId('open-delete-account').click();
    sendAndReadCode('ACCOUNT_DELETION', emailTarget, 'RequestAccountDeletionOtp', () => {
      cy.byTestId('confirm-dialog-confirm').should('contain.text', 'Send code').click();
    }).then((code) => {
      firstCode = code;
    });
    codeDialog().should('be.visible');
    cy.byTestId('delete-account-info').should('have.text', 'Code sent to your email.');
  });

  it('AD-03 a wrong code is refused', () => {
    fill('field-otp', wrongCode(firstCode));
    submitDeletion();
    deletionError().should('contain.text', 'Invalid OTP');
  });

  it('AD-04 a reason over 1,000 characters is refused', () => {
    fill('field-otp', firstCode);
    fill('field-reason', 'a'.repeat(1001), { delay: 0 });
    submitButton().click();
    cy.byTestId('reason-error').should('have.text', 'Please keep this under 1000 characters');
  });

  it('AD-05 Resend code makes the older code fail', () => {
    sendAndReadCode('ACCOUNT_DELETION', emailTarget, 'RequestAccountDeletionOtp', () => {
      cy.byTestId('delete-account-resend').should('have.text', 'Resend code').click();
    }).then((code) => {
      newestCode = code;
    });
    fill('field-reason', `E2E run ${account.stamp}`, { delay: 0 });
    fill('field-otp', firstCode);
    submitDeletion();
    deletionError().should('contain.text', 'Invalid OTP');
  });

  it('AD-06 the newest code files the request; the dialog stays until Sign out, which lands on /login', () => {
    fill('field-otp', newestCode);
    submitDeletion();
    cy.byTestId('deletion-submitted')
      .should('contain.text', 'Deletion request received')
      .invoke('text')
      .should('match', /Reference DUN-ADR-[0-9A-F]{6}/)
      .and('match', /will be deleted on \S/);
    cy.location('pathname').should('eq', '/account');
    cy.byTestId('deletion-sign-out').should('contain.text', 'Sign out').click();
    cy.location('pathname').should('eq', '/login');
  });

  it('AD-07 password sign-in is refused', () => {
    signInWithPassword(account.email, account.password('CHANGED'));
    expectPasswordRefused();
  });

  it('AD-08 code sign-in finds no account', () => {
    openSignedOut('/login');
    openOtpStep();
    sendCodeToEmail(account.email, 'RequestLoginOtp');
    expectNoAccount();
  });

  it('AD-09 forgot password finds no account', () => {
    openSignedOut('/forgot-password');
    sendCodeToEmail(account.email, 'RequestPasswordResetCode');
    expectNoAccount();
  });
});
