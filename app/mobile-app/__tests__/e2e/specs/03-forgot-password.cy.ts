import {
  expectDisabled,
  expectEnabled,
  expectHome,
  fill,
  openPasswordSignIn,
  passwordSignIn,
  sendCode,
  tap,
  wrongCode,
} from '../support/flows';
import { runAccount } from '../support/run-account';

/**
 * 03 · Forgot password (FP): the account moves from SIGNUP to RECOVERED.
 *
 * Native web: src/screens/ForgotPasswordScreen over
 * src/components/password-recovery (channel → code → new password → done).
 */
describe('Native · 03 forgot password', () => {
  const account = runAccount();
  const NOT_FOUND = 'We couldn’t find an account with these details.';

  /** The reset screen, opened the way a person reaches it: from the password step. */
  const openReset = (): void => {
    openPasswordSignIn();
    cy.byTestId('go-forgot-password').should('have.text', 'Forgot password?').click();
    cy.byTestId('forgot-password-screen').should('exist');
  };

  const fillCode = (code: string): void => {
    fill('field-otp', code);
  };

  it('FP-01 Forgot password? opens the reset, and Send code waits for a valid email', () => {
    openReset();
    expectDisabled('recovery-send-code');
    fill('field-email', 'riya@');
    expectDisabled('recovery-send-code');
    fill('field-email', account.email);
    expectEnabled('recovery-send-code');
  });

  it('FP-02 an address with no account offers Create Account', () => {
    openReset();
    fill('field-email', `nobody-${account.stamp}@example.invalid`);
    sendCode('MobileRequestPasswordResetCode');
    cy.byTestId('recovery-not-found').should('have.text', NOT_FOUND);
    cy.byTestId('recovery-create-account').should('contain', 'Create Account');
  });

  // One reset: the code and the new-password steps only exist inside the page
  // that reached them, so these scenarios share it.
  describe('the reset', { testIsolation: false }, () => {
    let issuedBefore = '';
    let cooldownSeconds = 0;

    it('FP-03 Send code moves to Enter your code, with no test code', () => {
      openReset();
      fill('field-email', account.email);
      cy.lastOtpIssuedAt('PASSWORD_RESET', { email: account.email }).then((issuedAt) => {
        issuedBefore = issuedAt;
      });
      sendCode('MobileRequestPasswordResetCode');
      cy.byTestId('forgot-password-screen').should('contain', 'Enter your code');
      cy.byTestId('recovery-test-code').should('not.exist');
    });

    it('FP-04 a wrong code says how many attempts are left', () => {
      cy.readOtp('PASSWORD_RESET', { email: account.email }, issuedBefore).then((code) => {
        fill('field-otp', wrongCode(code));
      });
      cy.interceptOperation('MobileVerifyPasswordResetCode');
      tap('recovery-verify-code');
      cy.wait('@MobileVerifyPasswordResetCode');
      cy.byTestId('recovery-error').should('have.text', 'Incorrect code — 4 attempts left');
    });

    it('FP-05 Back, then Send code inside 30 seconds, is asked to wait', () => {
      tap('recovery-back');
      cy.byTestId('field-email').should('have.value', account.email);
      sendCode('MobileRequestPasswordResetCode');
      cy.byTestId('recovery-error')
        .invoke('text')
        .should('match', /^Wait \d+s before asking for another code$/)
        .then((text) => {
          cooldownSeconds = Number(/Wait (\d+)s/.exec(text)?.[1]);
        });
    });

    it('FP-06 the held code opens Create a new password, which refuses a short or unmatched pair', () => {
      // The one clock this suite waits on: what is left of the resend cooldown.
      cy.wait((cooldownSeconds + 1) * 1000);
      cy.lastOtpIssuedAt('PASSWORD_RESET', { email: account.email }).then((older) => {
        sendCode('MobileRequestPasswordResetCode');
        cy.readOtp('PASSWORD_RESET', { email: account.email }, older).then(fillCode);
      });
      cy.interceptOperation('MobileVerifyPasswordResetCode');
      tap('recovery-verify-code');
      cy.wait('@MobileVerifyPasswordResetCode');
      cy.byTestId('forgot-password-screen').should('contain', 'Create a new password');
      expectDisabled('recovery-save-password');

      cy.byTestId('field-new_password').type('short', { delay: 0 });
      cy.byTestId('new_password-error').should('have.text', 'Min 8 characters');
      expectDisabled('recovery-save-password');

      fill('field-new_password', account.password('RECOVERED'));
      fill('field-confirm_password', `${account.password('RECOVERED')}-x`);
      cy.byTestId('confirm_password-error').should('have.text', 'Passwords do not match');
      expectDisabled('recovery-save-password');
    });

    it('FP-07 the current password is refused as one already used', () => {
      fill('field-new_password', account.password('SIGNUP'));
      fill('field-confirm_password', account.password('SIGNUP'));
      cy.interceptOperation('MobileCompletePasswordReset');
      tap('recovery-save-password');
      cy.wait('@MobileCompletePasswordReset');
      cy.byTestId('recovery-error').should(
        'have.text',
        'Choose a password you have not used on this account before',
      );
    });

    it('FP-08 the RECOVERED password is saved', () => {
      fill('field-new_password', account.password('RECOVERED'));
      fill('field-confirm_password', account.password('RECOVERED'));
      cy.interceptOperation('MobileCompletePasswordReset');
      tap('recovery-save-password');
      cy.wait('@MobileCompletePasswordReset');
      cy.byTestId('recovery-success').should('contain', 'Password changed successfully');
      cy.byTestId('recovery-go-login').should('contain', 'Continue to Login');
    });
  });

  it('FP-09 the old password is refused and the RECOVERED one signs in', () => {
    passwordSignIn(account.email, account.password('SIGNUP'));
    cy.byTestId('login-error').should('have.text', 'Invalid email or password');

    passwordSignIn(account.email, account.password('RECOVERED'));
    expectHome();
  });

  it('FP-11 the reset reaches Create a new password by WhatsApp number too (nothing is saved)', () => {
    openReset();
    tap('recovery-channel-PHONE');
    fill('field-number', account.phone);
    cy.lastOtpIssuedAt('PASSWORD_RESET', { phone: account.phone }).then((before) => {
      sendCode('MobileRequestPasswordResetCode');
      cy.byTestId('forgot-password-screen').should(
        'contain',
        `We sent a 6-digit code to +91 ${account.phone}.`,
      );
      cy.readOtp('PASSWORD_RESET', { phone: account.phone }, before).then(fillCode);
    });
    cy.interceptOperation('MobileVerifyPasswordResetCode');
    tap('recovery-verify-code');
    cy.wait('@MobileVerifyPasswordResetCode');
    // Stopped here on purpose: saving would change the password a second time.
    cy.byTestId('forgot-password-screen').should('contain', 'Create a new password');
    cy.byTestId('recovery-save-password').should('be.visible');
  });
});
