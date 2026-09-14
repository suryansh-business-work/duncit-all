import {
  expectLogin,
  fill,
  openAccount,
  openOtpSignIn,
  openPasswordSignIn,
  passwordSignIn,
  sendCode,
  tap,
  wrongCode,
} from '../support/flows';
import { runAccount } from '../support/run-account';

/**
 * 06 · Delete (AD) with the CHANGED password. Filing the request seals the
 * account; the purge in `after()` removes it so the email and number are free.
 *
 * Native web: the danger row in src/components/account/DeletionRequestPanel,
 * its code sheet DeleteAccountDialog and DeletionSubmittedDialog.
 */
describe('Native · 06 delete', () => {
  const account = runAccount();
  const mailbox = { email: account.email };
  const NOT_FOUND = 'We couldn’t find an account with these details.';

  after(() => {
    cy.purgeRunAccount();
  });

  /** Type a code (and a reason) on the code sheet and file the request. */
  const submitDeletion = (otp: string, reason = ''): void => {
    fill('field-otp', otp);
    cy.byTestId('field-reason').clear();
    if (reason) cy.byTestId('field-reason').type(reason, { delay: 0 });
    cy.interceptOperation('MobileSubmitAccountDeletionRequest');
    tap('delete-account-submit');
    cy.wait('@MobileSubmitAccountDeletionRequest');
  };

  const submitWrongCode = (code: string): void => {
    submitDeletion(wrongCode(code));
  };

  const RETENTION = `query E2eRetention { accountDeletionSettings { retention_days } }`;

  // One request: the code sheet only exists inside the page that opened it.
  describe('the request', { testIsolation: false }, () => {
    let issuedBefore = '';

    it('AD-01 Request account deletion asks first, with the retention days; Cancel sends nothing', () => {
      cy.apiLogin(account.email, account.password('CHANGED'));
      openAccount();
      cy.lastOtpIssuedAt('ACCOUNT_DELETION', mailbox).then((issuedAt) => {
        issuedBefore = issuedAt;
      });
      cy.byTestId('open-delete-account').should('contain', 'Request account deletion').click();
      cy.byTestId('confirm-dialog').should('contain', 'Request account deletion?');
      cy.gql<{ accountDeletionSettings: { retention_days: number } }>(RETENTION)
        .its('accountDeletionSettings.retention_days')
        .then((days) => {
          cy.byTestId('confirm-dialog').should('contain', `deleted ${days} days from now`);
        });
      cy.byTestId('confirm-dialog-cancel').should('contain', 'Cancel').click();
      cy.byTestId('confirm-dialog').should('not.exist');
      // Nothing was issued: the server holds no code newer than before the dialog.
      cy.lastOtpIssuedAt('ACCOUNT_DELETION', mailbox).then((issuedAt) => {
        expect(issuedAt, 'no deletion code was sent').to.eq(issuedBefore);
      });
    });

    it('AD-02 Send code opens the code step', () => {
      tap('open-delete-account');
      cy.interceptOperation('MobileRequestAccountDeletionOtp');
      cy.byTestId('confirm-dialog-confirm').should('contain', 'Send code').click();
      cy.wait('@MobileRequestAccountDeletionOtp');
      cy.byTestId('delete-account-dialog').should('be.visible');
      cy.byTestId('delete-account-info').should('have.text', 'Code sent to your email.');
    });

    it('AD-03 a wrong code is refused', () => {
      cy.readOtp('ACCOUNT_DELETION', mailbox, issuedBefore).then(submitWrongCode);
      cy.byTestId('delete-account-error').should('have.text', 'Invalid OTP');
    });

    it('AD-04 a reason over 1,000 characters is refused', () => {
      fill('field-reason', 'a'.repeat(1001));
      tap('delete-account-submit');
      cy.byTestId('reason-error').should('have.text', 'Please keep this under 1000 characters');
    });

    it('AD-05 Resend code makes the older code fail', () => {
      cy.readOtp('ACCOUNT_DELETION', mailbox, issuedBefore).as('olderCode', { type: 'static' });
      cy.lastOtpIssuedAt('ACCOUNT_DELETION', mailbox).then((older) => {
        issuedBefore = older;
      });
      cy.interceptOperation('MobileRequestAccountDeletionOtp');
      cy.byTestId('delete-account-resend').should('have.text', 'Resend code').click();
      cy.wait('@MobileRequestAccountDeletionOtp');
      cy.get<string>('@olderCode').then((code) => {
        submitDeletion(code);
      });
      cy.byTestId('delete-account-error').should('have.text', 'Invalid OTP');
    });

    it('AD-06 the newest code and a reason file the request; the dialog waits for Sign out', () => {
      cy.readOtp('ACCOUNT_DELETION', mailbox, issuedBefore).then((code) => {
        submitDeletion(code, `E2E run ${account.stamp}`);
      });
      cy.byTestId('deletion-submitted')
        .should('be.visible')
        .and('contain', 'Deletion request received')
        .and('contain', 'will be deleted on');
      cy.byTestId('deletion-submitted')
        .invoke('text')
        .should('match', /Reference DUN-ADR-\w{6}/);
      // Still signed in underneath: nothing signs out before the member does.
      cy.byTestId('account-screen').should('exist');
      cy.byTestId('login-screen').should('not.exist');

      cy.byTestId('deletion-sign-out').should('contain', 'Sign out').click();
      expectLogin();
    });
  });

  it('AD-07 password sign-in is refused', () => {
    passwordSignIn(account.email, account.password('CHANGED'));
    cy.byTestId('login-error').should('have.text', 'Invalid email or password');
  });

  it('AD-08 code sign-in finds no account', () => {
    openOtpSignIn();
    fill('field-email', account.email);
    sendCode('MobileRequestLoginOtp');
    cy.byTestId('recovery-not-found').should('have.text', NOT_FOUND);
  });

  it('AD-09 forgot password finds no account', () => {
    openPasswordSignIn();
    tap('go-forgot-password');
    fill('field-email', account.email);
    sendCode('MobileRequestPasswordResetCode');
    cy.byTestId('recovery-not-found').should('have.text', NOT_FOUND);
  });
});
