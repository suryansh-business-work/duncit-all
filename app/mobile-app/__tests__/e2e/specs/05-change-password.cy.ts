import { expectHome, fill, openAccount, passwordSignIn, tap, wrongCode } from '../support/flows';
import { runAccount } from '../support/run-account';

/**
 * 05 · Change password (CP): the account moves from RECOVERED to CHANGED.
 *
 * Native web: the Password row in src/components/account/SecuritySection and
 * its sheet, src/components/account/ChangePasswordDialog (current password →
 * emailed code + new pair).
 */
describe('Native · 05 change password', () => {
  const account = runAccount();
  const current = account.password('RECOVERED');
  const next = account.password('CHANGED');
  const mailbox = { email: account.email };

  /** Fill the code step and press Update password. */
  const submitNewPassword = (otp: string, password: string): void => {
    fill('field-otp', otp);
    fill('field-new_password', password);
    fill('field-confirm_password', password);
    tap('new-password-submit');
  };

  /** The same, with the CHANGED password, waiting for the server's answer. */
  const submitCode = (otp: string): void => {
    cy.interceptOperation('MobileChangePasswordWithOtp');
    submitNewPassword(otp, next);
    cy.wait('@MobileChangePasswordWithOtp');
  };

  // One sheet: the code step only exists inside the page that reached it.
  describe('the change', { testIsolation: false }, () => {
    let issuedBefore = '';

    it('CP-01 the Password card offers Change password to an account that has one', () => {
      cy.apiLogin(account.email, current);
      openAccount();
      cy.byTestId('security-section').should('contain', 'Password');
      cy.byTestId('open-change-password')
        .should('have.attr', 'aria-label', 'Change password')
        .and('have.text', 'Change');
    });

    it('CP-02 an empty current password is refused', () => {
      tap('open-change-password');
      cy.byTestId('change-password-dialog').should('be.visible');
      tap('current-password-submit');
      cy.byTestId('current_password-error').should('have.text', 'Enter your current password');
    });

    it('CP-03 a wrong current password is refused', () => {
      fill('field-current_password', `${current}-wrong`);
      cy.interceptOperation('MobileRequestPasswordChangeOtp');
      tap('current-password-submit');
      cy.wait('@MobileRequestPasswordChangeOtp');
      cy.byTestId('current-password-error').should('have.text', 'Current password is incorrect');
    });

    it('CP-04 the right one sends the code', () => {
      fill('field-current_password', current);
      cy.lastOtpIssuedAt('PASSWORD_CHANGE', mailbox).then((issuedAt) => {
        issuedBefore = issuedAt;
      });
      cy.interceptOperation('MobileRequestPasswordChangeOtp');
      tap('current-password-submit');
      cy.wait('@MobileRequestPasswordChangeOtp');
      cy.byTestId('change-password-info').should('have.text', 'OTP sent to your email.');
    });

    it('CP-05 a wrong code is refused', () => {
      cy.readOtp('PASSWORD_CHANGE', mailbox, issuedBefore).then((code) => {
        submitCode(wrongCode(code));
      });
      cy.byTestId('new-password-error').should('have.text', 'Invalid OTP');
    });

    it('CP-06 a new password equal to the current one is refused', () => {
      cy.readOtp('PASSWORD_CHANGE', mailbox, issuedBefore).then((code) => {
        submitNewPassword(code, current);
      });
      cy.byTestId('new-password-error').should(
        'have.text',
        'New password must be different from your current password',
      );
    });

    it('CP-07 the new pair needs 8 characters and has to match', () => {
      cy.byTestId('field-new_password').clear();
      cy.byTestId('field-new_password').type('short', { delay: 0 });
      cy.byTestId('field-new_password').blur();
      cy.byTestId('new_password-error').should('have.text', 'Min 8 characters');

      fill('field-new_password', next);
      fill('field-confirm_password', `${next}-x`);
      cy.byTestId('field-confirm_password').blur();
      cy.byTestId('confirm_password-error').should('have.text', 'Passwords do not match');
    });

    it('CP-08 Resend OTP makes the older code fail', () => {
      cy.readOtp('PASSWORD_CHANGE', mailbox, issuedBefore).as('olderCode', { type: 'static' });
      cy.lastOtpIssuedAt('PASSWORD_CHANGE', mailbox).then((older) => {
        issuedBefore = older;
      });
      cy.interceptOperation('MobileRequestPasswordChangeOtp');
      cy.byTestId('change-password-resend').should('have.text', 'Resend OTP').click();
      cy.wait('@MobileRequestPasswordChangeOtp');
      cy.get<string>('@olderCode').then(submitCode);
      cy.byTestId('new-password-error').should('have.text', 'Invalid OTP');
    });

    it('CP-09 the newest code updates the password; the old one is refused, CHANGED signs in', () => {
      cy.readOtp('PASSWORD_CHANGE', mailbox, issuedBefore).then(submitCode);
      cy.byTestId('password-changed-dialog').should('contain', 'Password updated');

      passwordSignIn(account.email, current);
      cy.byTestId('login-error').should('have.text', 'Invalid email or password');
      passwordSignIn(account.email, next);
      expectHome();
    });
  });
});
