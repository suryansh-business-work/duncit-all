/// <reference types="cypress" />
import {
  expectNoAccount,
  expectNoTestCode,
  expectPasswordRefused,
  fill,
  openOtpStep,
  openPasswordStep,
  openSignedOut,
  pressSendCode,
  savedToken,
  sendAndReadCode,
  sendCode,
  sendCodeToEmail,
  signInWithPassword,
  wrongCode,
} from '../support/account-steps';
import { runAccount } from '../support/run-account';

/**
 * 02 — Sign in, live (stage SIGNUP).
 *
 * Password, then one-time codes. A code for the same destination cannot be
 * re-sent inside 30 seconds, so the code scenarios alternate destinations:
 * a signed-in code is spent, and spending it frees its destination at once.
 */

const otpError = () => cy.byTestId('otp-login-error');
const loginSubmit = () => cy.byTestId('login-submit');

/** Type the code and press Verify & sign in, waiting for the server's answer. */
function verifyLoginCode(code: string): void {
  fill('field-otp', code);
  sendCode('LoginWithOtp', () => {
    cy.byTestId('recovery-verify-code').should('contain.text', 'Verify & sign in').and('be.enabled').click();
  });
}

describe('02 Sign in', () => {
  const account = runAccount();
  const password = account.password('SIGNUP');
  const emailTarget = { email: account.email };
  const phoneTarget = { phone: account.phone };
  const nobody = `nobody-${account.stamp}@example.invalid`;

  describe('with a password', () => {
    it('SI-01 signed out, Home redirects to the sign-in options', () => {
      openSignedOut('/');
      cy.location('pathname').should('eq', '/login');
      cy.byTestId('login-screen').should('exist');
      cy.byTestId('continue-with-password').should('contain.text', 'Continue with Password');
      cy.byTestId('continue-with-otp').should('contain.text', 'Continue with OTP');
      cy.byTestId('go-signup').should('have.text', 'Create one').and('have.attr', 'href', '/register');
    });

    it('SI-02 an empty Log me in asks for the email and the password', () => {
      openSignedOut('/login');
      openPasswordStep();
      loginSubmit().should('contain.text', 'Log me in').click();
      cy.byTestId('email-error').should('have.text', 'Email is required');
      cy.byTestId('password-error').should('have.text', 'Min 8 characters');
    });

    it('SI-03 an address that is not an email is refused', () => {
      openSignedOut('/login');
      openPasswordStep();
      cy.byTestId('field-email').type('not-an-email');
      loginSubmit().click();
      cy.byTestId('email-error').should('have.text', 'Enter a valid email');
    });

    it('SI-04 a wrong password is refused', () => {
      signInWithPassword(account.email, `${password}-wrong`);
      expectPasswordRefused();
    });

    it('SI-05 an address with no account gets the same refusal', () => {
      signInWithPassword(nobody, password);
      expectPasswordRefused();
    });

    it('SI-06 email and password land on Home with a token saved', () => {
      signInWithPassword(account.email, password);
      cy.location('pathname').should('eq', '/');
      savedToken().should('be.a', 'string').and('not.be.empty');
    });

    it('SI-07 the Phone tab with +91 and the number signs in', () => {
      openSignedOut('/login');
      openPasswordStep();
      cy.byTestId('login-channel-PHONE').click();
      cy.byTestId('login-code-trigger').should('have.value', '+91');
      cy.byTestId('field-phoneNumber').type(account.phone);
      cy.byTestId('field-password').type(password, { log: false });
      sendCode('Login', () => {
        loginSubmit().click();
      });
      cy.location('pathname').should('eq', '/');
    });

    it('SI-08 switching Email and Phone clears what was typed', () => {
      openSignedOut('/login');
      openPasswordStep();
      cy.byTestId('field-email').type(account.email);
      cy.byTestId('field-password').type(password, { log: false });
      cy.byTestId('login-channel-PHONE').click();
      cy.byTestId('field-phoneNumber').should('have.value', '').type(account.phone);
      cy.byTestId('field-password').should('have.value', '');
      cy.byTestId('login-channel-EMAIL').click();
      cy.byTestId('field-email').should('have.value', '');
    });

    it('SI-09 Back to sign-in options returns to the chooser', () => {
      openSignedOut('/login');
      openPasswordStep();
      cy.byTestId('back-to-options').should('contain.text', 'Back to sign-in options').click();
      cy.byTestId('continue-with-otp').should('be.visible');
      loginSubmit().should('not.exist');
    });

    it('SI-10 /login?redirect=/account lands on /account after signing in', () => {
      signInWithPassword(account.email, password, '/login?redirect=/account');
      cy.location('pathname').should('eq', '/account');
    });
  });

  describe('with a one-time code', () => {
    it('SI-11 a code by email: Send code waits for a valid address, then the code signs in', () => {
      openSignedOut('/login');
      openOtpStep();
      cy.byTestId('field-email').type('riya@');
      cy.byTestId('recovery-send-code').should('be.disabled');
      fill('field-email', account.email);
      sendAndReadCode('LOGIN', emailTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        cy.byTestId('login-screen').should(
          'contain.text',
          `We sent a 6-digit code to ${account.email.toLowerCase()}.`,
        );
        expectNoTestCode('recovery-test-code');
        verifyLoginCode(code);
      });
      cy.location('pathname').should('eq', '/');
    });

    it('SI-12 a code by WhatsApp number signs in the same way', () => {
      openSignedOut('/login');
      openOtpStep();
      cy.byTestId('recovery-channel-PHONE').click();
      cy.byTestId('field-number').type(account.phone);
      sendAndReadCode('LOGIN', phoneTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        cy.byTestId('login-screen').should('contain.text', `We sent a 6-digit code to +91 ${account.phone}.`);
        expectNoTestCode('recovery-test-code');
        verifyLoginCode(code);
      });
      cy.location('pathname').should('eq', '/');
    });

    it('SI-13 a wrong code is refused with the attempts left', () => {
      openSignedOut('/login');
      openOtpStep();
      cy.byTestId('recovery-channel-PHONE').click();
      cy.byTestId('field-number').type(account.phone);
      sendAndReadCode('LOGIN', phoneTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        verifyLoginCode(wrongCode(code));
      });
      otpError().should('contain.text', 'Incorrect code — 4 attempts left');
      cy.location('pathname').should('eq', '/login');
    });

    it('SI-14 an unknown address is told there is no account, with Create Account', () => {
      openSignedOut('/login');
      openOtpStep();
      sendCodeToEmail(nobody, 'RequestLoginOtp');
      expectNoAccount();
    });

    it('SI-15 Resend counts down; the newest code works and the older one is refused', () => {
      let olderCode = '';
      let newestCode = '';
      openSignedOut('/login');
      openOtpStep();
      cy.byTestId('field-email').type(account.email);
      sendAndReadCode('LOGIN', emailTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        olderCode = code;
      });
      cy.byTestId('recovery-resend').should('be.disabled').invoke('text').should('match', /^Resend in \d+s$/);
      // The cooldown is a real 30 seconds; the button says when it is over.
      cy.byTestId('recovery-resend', { timeout: 45_000 }).should('have.text', 'Resend code').and('be.enabled');
      sendAndReadCode('LOGIN', emailTarget, 'RequestLoginOtp', () => {
        cy.byTestId('recovery-resend').click();
      }).then((code) => {
        newestCode = code;
      });
      cy.then(() => verifyLoginCode(olderCode));
      otpError().should('contain.text', 'Incorrect code');
      cy.then(() => verifyLoginCode(newestCode));
      cy.location('pathname').should('eq', '/');
    });

    it('SI-16 Back from the code step keeps the typed address', () => {
      openSignedOut('/login');
      openOtpStep();
      sendCodeToEmail(account.email, 'RequestLoginOtp');
      cy.byTestId('field-otp').should('be.visible');
      cy.byTestId('otp-back').click();
      cy.byTestId('field-email').should('have.value', account.email);
    });
  });

  it('SI-17 Logout returns to /login, and /account then redirects to /login', () => {
    cy.apiLogin(account.email, password);
    cy.visitApp('/account');
    cy.byTestId('account-logout').should('contain.text', 'Logout').click();
    cy.location('pathname').should('eq', '/login');
    savedToken().should('be.null');
    // The browser holds no token now; /account must not open without one.
    cy.clearAuth();
    cy.visitApp('/account');
    cy.location('pathname').should('eq', '/login');
  });
});
