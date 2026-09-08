/// <reference types="cypress" />

import { identity, recoveredPassword } from '../support/identity';

/**
 * Sign in, against the real server.
 *
 * The password and one-time-code scenarios use the stable login account,
 * which changes nothing about it. Password recovery has to SET a password,
 * so it runs against the account the signup spec created for this run — and
 * it runs after the onboarding spec, which is the last thing to sign in with
 * the original one.
 */

const openPasswordStep = () => cy.get('[data-testid="continue-with-password"]').click();

function signInWithPassword(email: string, password: string) {
  cy.visitApp('/login');
  openPasswordStep();
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.interceptOperation('Login');
  cy.contains('button', 'Log me in').click();
  cy.wait('@Login');
}

describe('Sign in', () => {
  const me = identity();

  beforeEach(() => {
    cy.blockThirdParty();
    cy.clearAuth();
  });

  it('a signed-out visit lands on the sign-in options', () => {
    cy.visitApp('/');
    cy.location('pathname').should('match', /\/login/);
    cy.contains('How would you like to sign in?').should('be.visible');
    cy.get('[data-testid="continue-with-password"]').should('be.visible');
    cy.get('[data-testid="continue-with-otp"]').should('be.visible');
    cy.contains('a', 'Create one').should('have.attr', 'href').and('match', /register/);
  });

  it('the password step refuses an empty email, a bad email and a short password', () => {
    cy.visitApp('/login');
    openPasswordStep();
    cy.contains('button', 'Log me in').click();
    cy.contains('Email is required').should('be.visible');
    cy.contains('Min 8 characters').should('be.visible');

    cy.get('input[name="email"]').type('not-an-email');
    cy.contains('button', 'Log me in').click();
    cy.contains('Enter a valid email').should('be.visible');
  });

  it('refuses a wrong password', () => {
    signInWithPassword(me.loginEmail, `${me.password}-wrong`);
    cy.contains('Invalid email or password').should('be.visible');
    cy.location('pathname').should('match', /\/login/);
  });

  it('refuses an address that has no account, with the same words as a wrong password', () => {
    // Deliberately the same message: a different one would tell a caller which
    // addresses have accounts.
    signInWithPassword(`nobody-${me.stamp}@example.invalid`, me.password);
    cy.contains('Invalid email or password').should('be.visible');
    cy.location('pathname').should('match', /\/login/);
  });

  it('signs in with email and password and lands on home', () => {
    signInWithPassword(me.loginEmail, me.password);
    cy.location('pathname').should('eq', '/');
    cy.window().its('localStorage.token').should('be.a', 'string').and('not.be.empty');
  });

  it('can go back to the sign-in options from the password step', () => {
    cy.visitApp('/login');
    openPasswordStep();
    cy.get('[data-testid="back-to-options"]').click();
    cy.contains('How would you like to sign in?').should('be.visible');
  });

  it('signs in with a one-time code sent by email', () => {
    cy.visitApp('/login');
    cy.get('[data-testid="continue-with-otp"]').click();
    cy.get('input[name="email"]').type(me.loginEmail);
    cy.interceptOperation('RequestLoginOtp');
    cy.contains('button', 'Send code').should('be.enabled').click();
    cy.wait('@RequestLoginOtp');
    cy.contains('We sent a 6-digit code to').should('be.visible');

    cy.readTestCode().then((code) => {
      cy.get('input[name="otp"]').type(code);
    });
    cy.interceptOperation('LoginWithOtp');
    cy.contains('button', 'Verify & sign in').should('be.enabled').click();
    cy.wait('@LoginWithOtp');
    cy.location('pathname').should('eq', '/');
  });

  it('refuses a wrong one-time code', () => {
    cy.visitApp('/login');
    cy.get('[data-testid="continue-with-otp"]').click();
    cy.get('input[name="email"]').type(me.loginEmail);
    cy.interceptOperation('RequestLoginOtp');
    cy.contains('button', 'Send code').should('be.enabled').click();
    cy.wait('@RequestLoginOtp');
    cy.readTestCode().then((code) => {
      // Any six digits other than the real ones.
      const wrong = code === '000000' ? '111111' : '000000';
      cy.get('input[name="otp"]').type(wrong);
    });
    cy.contains('button', 'Verify & sign in').should('be.enabled').click();
    cy.contains(/Incorrect code/).should('be.visible');
    cy.location('pathname').should('match', /\/login/);
  });

  it('tells a code request for an unknown address that there is no account', () => {
    cy.visitApp('/login');
    cy.get('[data-testid="continue-with-otp"]').click();
    cy.get('input[name="email"]').type(`nobody-${me.stamp}@example.invalid`);
    cy.interceptOperation('RequestLoginOtp');
    cy.contains('button', 'Send code').should('be.enabled').click();
    cy.wait('@RequestLoginOtp');
    cy.contains('We couldn’t find an account with these details.').should('be.visible');
    // A router link, so it renders as an anchor rather than a button.
    cy.contains('a', 'Create Account').should('be.visible').and('have.attr', 'href', '/register');
  });

  it('recovers a forgotten password with an emailed code and signs in with the new one', () => {
    const newPassword = recoveredPassword();
    cy.visitApp('/forgot-password');
    cy.contains('Step 1 of 3').should('be.visible');
    cy.get('input[name="email"]').type(me.signupEmail);
    cy.interceptOperation('RequestPasswordResetCode');
    cy.contains('button', 'Send code').should('be.enabled').click();
    cy.wait('@RequestPasswordResetCode');

    cy.contains('Step 2 of 3').should('be.visible');
    cy.readTestCode().then((code) => {
      cy.get('input[name="otp"]').type(code);
    });
    cy.interceptOperation('VerifyPasswordResetCode');
    cy.contains('button', 'Verify code').should('be.enabled').click();
    cy.wait('@VerifyPasswordResetCode');

    cy.contains('Step 3 of 3').should('be.visible');
    cy.get('input[name="new_password"]').type(newPassword);
    cy.get('input[name="confirm_password"]').type(newPassword);
    cy.interceptOperation('CompletePasswordReset');
    cy.contains('button', 'Save password').should('be.enabled').click();
    cy.wait('@CompletePasswordReset');
    cy.get('[data-testid="recovery-success"]').should('be.visible');
    cy.contains('button', 'Continue to Login').click();
    cy.location('pathname').should('match', /\/login/);

    // The old password is gone; the new one opens the account.
    signInWithPassword(me.signupEmail, newPassword);
    cy.location('pathname').should('match', /^\/(signup-survey)?$/);
  });

  it('refuses the old password once it has been reset', () => {
    signInWithPassword(me.signupEmail, me.password);
    cy.contains('Invalid email or password').should('be.visible');
  });
});
