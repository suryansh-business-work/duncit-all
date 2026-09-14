/// <reference types="cypress" />
import {
  DIALOG,
  dialogWith,
  NO_ACCOUNT,
  PASSWORD_REFUSED,
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
 * 06 — Account deletion, live (stage CHANGED). The last spec of the surface:
 * filing the request seals the account, and `after()` purges it outright so
 * the next surface can sign up with the same email and number.
 *
 * AD-01..AD-06 are one flow on one page, in order.
 */

const DELETION_SETTINGS_QUERY = `query E2eAccountDeletionSettings {
  accountDeletionSettings { retention_days }
}`;

const confirmDialog = () => dialogWith('Request account deletion?');
const codeDialog = () => dialogWith('Enter the code to send your deletion request.');
const submitButton = () => cy.get('[data-testid="delete-account-submit"]');

/** The warning names the window when the server has one; without one it only says it cannot be undone. */
function confirmCopy(retentionDays: number | null): string {
  if (retentionDays === null) return 'This cannot be undone from the app.';
  return `Your account and everything on it will be deleted ${retentionDays} days from now.`;
}

function typeDeletionCode(code: string): void {
  codeDialog().find('input[name="otp"]').clear().type(code);
}

function typeReason(reason: string): void {
  codeDialog().find('textarea[name="reason"]').clear().type(reason, { delay: 0 });
}

function submitDeletion(): void {
  sendCode('SubmitAccountDeletionRequest', () => {
    submitButton().click();
  });
}

describe('06 Delete account', { testIsolation: false }, () => {
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
    cy.get('[data-testid="open-delete-account"]').should('contain.text', 'Request account deletion').click();
    cy.then(() => {
      cy.contains(DIALOG, confirmCopy(retentionDays)).should('be.visible');
    });
    confirmDialog().contains('button', 'Cancel').click();
    cy.contains('Request account deletion?').should('not.exist');
    cy.lastOtpIssuedAt('ACCOUNT_DELETION', emailTarget).then((issuedAt) => {
      expect(issuedAt, 'the newest deletion code after Cancel').to.equal(issuedBeforeCancel);
    });
  });

  it('AD-02 Send code opens the code step', () => {
    cy.get('[data-testid="open-delete-account"]').click();
    sendAndReadCode('ACCOUNT_DELETION', emailTarget, 'RequestAccountDeletionOtp', () => {
      confirmDialog().contains('button', 'Send code').click();
    }).then((code) => {
      firstCode = code;
    });
    cy.contains(DIALOG, 'Code sent to your email.').should('be.visible');
  });

  it('AD-03 a wrong code is refused', () => {
    typeDeletionCode(wrongCode(firstCode));
    submitDeletion();
    cy.contains(DIALOG, 'Invalid OTP').should('be.visible');
  });

  it('AD-04 a reason over 1,000 characters is refused', () => {
    typeDeletionCode(firstCode);
    typeReason('a'.repeat(1001));
    submitButton().click();
    cy.contains(DIALOG, 'Please keep this under 1000 characters').should('be.visible');
  });

  it('AD-05 Resend code makes the older code fail', () => {
    sendAndReadCode('ACCOUNT_DELETION', emailTarget, 'RequestAccountDeletionOtp', () => {
      codeDialog().contains('button', 'Resend code').click();
    }).then((code) => {
      newestCode = code;
    });
    typeReason(`E2E run ${account.stamp}`);
    typeDeletionCode(firstCode);
    submitDeletion();
    cy.contains(DIALOG, 'Invalid OTP').should('be.visible');
  });

  it('AD-06 the newest code files the request; the dialog stays until Sign out, which lands on /login', () => {
    typeDeletionCode(newestCode);
    submitDeletion();
    cy.get('[data-testid="deletion-submitted"]')
      .should('contain.text', 'Deletion request received')
      .invoke('text')
      .should('match', /Reference DUN-ADR-[0-9A-F]{6}/)
      .and('match', /will be deleted on \S/);
    cy.location('pathname').should('eq', '/account');
    cy.get('[data-testid="deletion-sign-out"]').should('contain.text', 'Sign out').click();
    cy.location('pathname').should('eq', '/login');
  });

  it('AD-07 password sign-in is refused', () => {
    signInWithPassword(account.email, account.password('CHANGED'));
    cy.contains(PASSWORD_REFUSED).should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('AD-08 code sign-in finds no account', () => {
    openSignedOut('/login');
    openOtpStep();
    sendCodeToEmail(account.email, 'RequestLoginOtp');
    cy.contains(NO_ACCOUNT).should('be.visible');
    cy.contains('a', 'Create Account').should('have.attr', 'href', '/register');
  });

  it('AD-09 forgot password finds no account', () => {
    openSignedOut('/forgot-password');
    sendCodeToEmail(account.email, 'RequestPasswordResetCode');
    cy.contains(NO_ACCOUNT).should('be.visible');
    cy.contains('a', 'Create Account').should('have.attr', 'href', '/register');
  });
});
