import {
  expectDisabled,
  expectEnabled,
  expectHome,
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
 * 02 · Sign in (SI) with the password the account was created with (SIGNUP).
 *
 * Native web: src/screens/LoginScreen (chooser, password step, Continue with
 * OTP) over src/forms/login and src/components/password-recovery.
 */
describe('Native · 02 sign in', () => {
  const account = runAccount();
  const password = account.password('SIGNUP');
  const INVALID = 'Invalid email or password';

  /** Continue with OTP by email, up to the code step. */
  const emailCodeStep = (): void => {
    openOtpSignIn();
    fill('field-email', account.email);
    sendCode('MobileRequestLoginOtp');
    cy.byTestId('recovery-verify-code').should('be.visible');
  };

  /** Type a code on the code step and press Verify & sign in. */
  const verifyCode = (code: string): void => {
    fill('field-otp', code);
    cy.interceptOperation('MobileLoginWithOtp');
    tap('recovery-verify-code');
    cy.wait('@MobileLoginWithOtp');
  };

  it('SI-01 signed out, Home sends you to /login with both methods and Create one', () => {
    cy.clearAuth();
    cy.visitApp('/');
    expectLogin();
    cy.byTestId('continue-with-password').should('have.text', 'Continue with Password');
    cy.byTestId('continue-with-otp').should('have.text', 'Continue with OTP');
    cy.byTestId('go-signup').should('have.text', 'Create one');
  });

  it('SI-02 an empty Log me in asks for the email and the password', () => {
    openPasswordSignIn();
    cy.byTestId('login-submit').should('contain', 'Log me in').click();
    cy.byTestId('email-error').should('have.text', 'Email is required');
    cy.byTestId('password-error').should('have.text', 'Min 8 characters');
  });

  it('SI-03 an address that is not an email is refused', () => {
    openPasswordSignIn();
    fill('field-email', 'not-an-email');
    fill('field-password', password);
    tap('login-submit');
    cy.byTestId('email-error').should('have.text', 'Enter a valid email');
  });

  it('SI-04 a wrong password is refused', () => {
    passwordSignIn(account.email, `${password}-wrong`);
    cy.byTestId('login-error').should('have.text', INVALID);
  });

  it('SI-05 an address with no account gets the same refusal', () => {
    passwordSignIn(`nobody-${account.stamp}@example.invalid`, password);
    cy.byTestId('login-error').should('have.text', INVALID);
  });

  it('SI-06 the email and password land on Home with a token saved', () => {
    passwordSignIn(account.email, password);
    expectHome();
  });

  it('SI-07 the Phone tab signs in with +91, the number and the password', () => {
    openPasswordSignIn();
    tap('login-channel-PHONE');
    cy.byTestId('login-code-trigger').should('contain', '+91');
    fill('field-phoneNumber', account.phone);
    fill('field-password', password);
    cy.interceptOperation('MobileLogin');
    tap('login-submit');
    cy.wait('@MobileLogin');
    expectHome();
  });

  it('SI-08 switching Email and Phone clears what was typed', () => {
    openPasswordSignIn();
    fill('field-email', account.email);
    tap('login-channel-PHONE');
    fill('field-phoneNumber', account.phone);
    tap('login-channel-EMAIL');
    cy.byTestId('field-email').should('have.value', '');
    tap('login-channel-PHONE');
    cy.byTestId('field-phoneNumber').should('have.value', '');
  });

  it('SI-09 Back to sign-in options returns to the chooser', () => {
    openPasswordSignIn();
    cy.byTestId('back-to-options').should('have.text', 'Back to sign-in options').click();
    cy.byTestId('continue-with-password').should('be.visible');
    cy.byTestId('login-submit').should('not.exist');
  });

  it('SI-11 a code by email: Send code waits for a valid address, then signs in', () => {
    openOtpSignIn();
    expectDisabled('recovery-send-code');
    fill('field-email', 'riya@');
    expectDisabled('recovery-send-code');
    fill('field-email', account.email);
    expectEnabled('recovery-send-code');

    cy.lastOtpIssuedAt('LOGIN', { email: account.email }).then((before) => {
      sendCode('MobileRequestLoginOtp');
      cy.byTestId('login-screen').should(
        'contain',
        `We sent a 6-digit code to ${account.email.toLowerCase()}.`,
      );
      cy.byTestId('recovery-test-code').should('not.exist');
      cy.byTestId('recovery-verify-code').should('contain', 'Verify & sign in');
      cy.readOtp('LOGIN', { email: account.email }, before).then(verifyCode);
    });
    expectHome();
  });

  it('SI-12 a code by WhatsApp number signs in the same way', () => {
    openOtpSignIn();
    tap('recovery-channel-PHONE');
    fill('field-number', account.phone);
    cy.lastOtpIssuedAt('LOGIN', { phone: account.phone }).then((before) => {
      sendCode('MobileRequestLoginOtp');
      cy.byTestId('recovery-test-code').should('not.exist');
      cy.readOtp('LOGIN', { phone: account.phone }, before).then(verifyCode);
    });
    expectHome();
  });

  it('SI-13 a wrong code says how many attempts are left', () => {
    cy.lastOtpIssuedAt('LOGIN', { email: account.email }).then((before) => {
      emailCodeStep();
      cy.readOtp('LOGIN', { email: account.email }, before).then((code) => {
        verifyCode(wrongCode(code));
      });
    });
    cy.byTestId('otp-login-error').should('have.text', 'Incorrect code — 4 attempts left');
  });

  it('SI-14 an address with no account is not sent a code', () => {
    openOtpSignIn();
    fill('field-email', `nobody-${account.stamp}@example.invalid`);
    sendCode('MobileRequestLoginOtp');
    cy.byTestId('recovery-not-found').should(
      'have.text',
      'We couldn’t find an account with these details.',
    );
    cy.byTestId('recovery-verify-code').should('not.exist');
  });

  it('SI-15 Resend counts down, and only the newest code signs in', () => {
    openOtpSignIn();
    tap('recovery-channel-PHONE');
    fill('field-number', account.phone);
    cy.lastOtpIssuedAt('LOGIN', { phone: account.phone }).then((before) => {
      sendCode('MobileRequestLoginOtp');
      cy.readOtp('LOGIN', { phone: account.phone }, before).as('olderCode', { type: 'static' });
    });
    cy.byTestId('recovery-resend')
      .invoke('text')
      .should('match', /^Resend in \d+s$/);
    // The one clock this suite waits on: the server's 30-second resend cooldown.
    cy.byTestId('recovery-resend', { timeout: 45_000 }).should('have.text', 'Resend code');

    cy.lastOtpIssuedAt('LOGIN', { phone: account.phone }).then((older) => {
      cy.interceptOperation('MobileRequestLoginOtp', 'resend');
      cy.byTestId('recovery-resend').click();
      cy.wait('@resend');
      cy.readOtp('LOGIN', { phone: account.phone }, older).as('newestCode', { type: 'static' });
    });

    cy.get<string>('@olderCode').then(verifyCode);
    cy.byTestId('otp-login-error').should('contain', 'Incorrect code');
    cy.get<string>('@newestCode').then(verifyCode);
    expectHome();
  });

  it('SI-16 Back from the code step keeps the typed address', () => {
    emailCodeStep();
    cy.byTestId('otp-back').should('have.text', 'Back').click();
    cy.byTestId('recovery-send-code').should('be.visible');
    cy.byTestId('field-email').should('have.value', account.email);
  });

  it('SI-17 Logout returns to /login, and /account then sends you there too', () => {
    cy.apiLogin(account.email, password);
    openAccount();
    tap('account-logout');
    expectLogin();

    cy.clearAuth();
    cy.visitApp('/account');
    expectLogin();
  });
});
