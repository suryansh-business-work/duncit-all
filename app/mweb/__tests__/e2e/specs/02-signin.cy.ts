/// <reference types="cypress" />
import {
  channelTab,
  NO_ACCOUNT,
  expectNoTestCode,
  PASSWORD_REFUSED,
  openOtpStep,
  openPasswordStep,
  openSignedOut,
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

const OTP_ERROR = '[data-testid="otp-login-error"]';
const emailBox = () => cy.get('input[name="email"]');
const numberBox = () => cy.get('input[name="number"]');

/** Type the code and press Verify & sign in, waiting for the server's answer. */
function verifyLoginCode(code: string): void {
  cy.get('input[name="otp"]').clear().type(code);
  sendCode('LoginWithOtp', () => {
    cy.contains('button', 'Verify & sign in').should('be.enabled').click();
  });
}

describe('02 Sign in', () => {
  const account = runAccount();
  const password = account.password('SIGNUP');
  const emailTarget = { email: account.email };
  const phoneTarget = { phone: account.phone };
  const nobody = `nobody-${account.stamp}@example.invalid`;

  const pressSendCode = () => {
    cy.contains('button', 'Send code').should('be.enabled').click();
  };

  describe('with a password', () => {
    it('SI-01 signed out, Home redirects to the sign-in options', () => {
      openSignedOut('/');
      cy.location('pathname').should('eq', '/login');
      cy.get('[data-testid="continue-with-password"]').should('contain.text', 'Continue with Password');
      cy.get('[data-testid="continue-with-otp"]').should('contain.text', 'Continue with OTP');
      cy.contains('a', 'Create one').should('have.attr', 'href', '/register');
    });

    it('SI-02 an empty Log me in asks for the email and the password', () => {
      openSignedOut('/login');
      openPasswordStep();
      cy.contains('button', 'Log me in').click();
      cy.contains('Email is required').should('be.visible');
      cy.contains('Min 8 characters').should('be.visible');
    });

    it('SI-03 an address that is not an email is refused', () => {
      openSignedOut('/login');
      openPasswordStep();
      emailBox().type('not-an-email');
      cy.contains('button', 'Log me in').click();
      cy.contains('Enter a valid email').should('be.visible');
    });

    it('SI-04 a wrong password is refused', () => {
      signInWithPassword(account.email, `${password}-wrong`);
      cy.contains(PASSWORD_REFUSED).should('be.visible');
      cy.location('pathname').should('eq', '/login');
    });

    it('SI-05 an address with no account gets the same refusal', () => {
      signInWithPassword(nobody, password);
      cy.contains(PASSWORD_REFUSED).should('be.visible');
      cy.location('pathname').should('eq', '/login');
    });

    it('SI-06 email and password land on Home with a token saved', () => {
      signInWithPassword(account.email, password);
      cy.location('pathname').should('eq', '/');
      savedToken().should('be.a', 'string').and('not.be.empty');
    });

    it('SI-07 the Phone tab with +91 and the number signs in', () => {
      openSignedOut('/login');
      openPasswordStep();
      channelTab('Phone').click();
      cy.fieldByLabel(/^Code$/).should('have.value', '+91');
      cy.get('input[name="phoneNumber"]').type(account.phone);
      cy.get('input[name="password"]').type(password, { log: false });
      sendCode('Login', () => {
        cy.contains('button', 'Log me in').click();
      });
      cy.location('pathname').should('eq', '/');
    });

    it('SI-08 switching Email and Phone clears what was typed', () => {
      openSignedOut('/login');
      openPasswordStep();
      emailBox().type(account.email);
      cy.get('input[name="password"]').type(password, { log: false });
      channelTab('Phone').click();
      cy.get('input[name="phoneNumber"]').should('have.value', '').type(account.phone);
      cy.get('input[name="password"]').should('have.value', '');
      channelTab('Email').click();
      emailBox().should('have.value', '');
    });

    it('SI-09 Back to sign-in options returns to the chooser', () => {
      openSignedOut('/login');
      openPasswordStep();
      cy.get('[data-testid="back-to-options"]').should('contain.text', 'Back to sign-in options').click();
      cy.get('[data-testid="continue-with-otp"]').should('be.visible');
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
      emailBox().type('riya@');
      cy.contains('button', 'Send code').should('be.disabled');
      emailBox().clear().type(account.email);
      sendAndReadCode('LOGIN', emailTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        cy.contains(`We sent a 6-digit code to ${account.email.toLowerCase()}.`).should('be.visible');
        expectNoTestCode();
        verifyLoginCode(code);
      });
      cy.location('pathname').should('eq', '/');
    });

    it('SI-12 a code by WhatsApp number signs in the same way', () => {
      openSignedOut('/login');
      openOtpStep();
      channelTab('Phone').click();
      numberBox().type(account.phone);
      sendAndReadCode('LOGIN', phoneTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        cy.contains(`We sent a 6-digit code to +91 ${account.phone}.`).should('be.visible');
        expectNoTestCode();
        verifyLoginCode(code);
      });
      cy.location('pathname').should('eq', '/');
    });

    it('SI-13 a wrong code is refused with the attempts left', () => {
      openSignedOut('/login');
      openOtpStep();
      channelTab('Phone').click();
      numberBox().type(account.phone);
      sendAndReadCode('LOGIN', phoneTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        verifyLoginCode(wrongCode(code));
      });
      cy.get(OTP_ERROR).should('contain.text', 'Incorrect code — 4 attempts left');
      cy.location('pathname').should('eq', '/login');
    });

    it('SI-14 an unknown address is told there is no account, with Create Account', () => {
      openSignedOut('/login');
      openOtpStep();
      sendCodeToEmail(nobody, 'RequestLoginOtp');
      cy.contains(NO_ACCOUNT).should('be.visible');
      cy.contains('a', 'Create Account').should('have.attr', 'href', '/register');
    });

    it('SI-15 Resend counts down; the newest code works and the older one is refused', () => {
      let olderCode = '';
      let newestCode = '';
      openSignedOut('/login');
      openOtpStep();
      emailBox().type(account.email);
      sendAndReadCode('LOGIN', emailTarget, 'RequestLoginOtp', pressSendCode).then((code) => {
        olderCode = code;
      });
      cy.contains('button', /^Resend in \d+s$/).should('be.disabled');
      // The cooldown is a real 30 seconds; the button says when it is over.
      cy.contains('button', 'Resend code', { timeout: 45_000 }).should('be.enabled');
      sendAndReadCode('LOGIN', emailTarget, 'RequestLoginOtp', () => {
        cy.contains('button', 'Resend code').click();
      }).then((code) => {
        newestCode = code;
      });
      cy.then(() => verifyLoginCode(olderCode));
      cy.get(OTP_ERROR).should('contain.text', 'Incorrect code');
      cy.then(() => verifyLoginCode(newestCode));
      cy.location('pathname').should('eq', '/');
    });

    it('SI-16 Back from the code step keeps the typed address', () => {
      openSignedOut('/login');
      openOtpStep();
      sendCodeToEmail(account.email, 'RequestLoginOtp');
      cy.get('input[name="otp"]').should('be.visible');
      cy.get('[data-testid="otp-back"]').click();
      emailBox().should('have.value', account.email);
    });
  });

  it('SI-17 Logout returns to /login, and /account then redirects to /login', () => {
    cy.apiLogin(account.email, password);
    cy.visitApp('/account');
    cy.contains('button', 'Logout').click();
    cy.location('pathname').should('eq', '/login');
    savedToken().should('be.null');
    // The browser holds no token now; /account must not open without one.
    cy.clearAuth();
    cy.visitApp('/account');
    cy.location('pathname').should('eq', '/login');
  });
});
