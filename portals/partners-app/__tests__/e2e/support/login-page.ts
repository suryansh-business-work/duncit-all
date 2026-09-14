import type { CodeTarget } from './commands';

/**
 * The console login screen Partners mounts: @duncit/user-context's
 * LoginScreen + login.form (password) with @duncit/shell's OtpLoginPanel (code)
 * under it. Every element is found by its test id; the ids repeat the native
 * app's `testID` wherever the element is the same thing there.
 */

/** Open the login page signed out. */
export function openLogin(): void {
  cy.clearAuth();
  cy.visitApp('/login');
  cy.byTestId('login-screen').should('be.visible');
}

/** Sign in with a password and wait for the server's answer. */
export function submitPassword(email: string, password: string): void {
  cy.byTestId('field-email').clear().type(email);
  cy.byTestId('field-password').clear().type(password, { log: false });
  cy.interceptOperation('PartnerLogin');
  cy.byTestId('login-submit').click();
  cy.wait('@PartnerLogin');
}

/**
 * `Login with OTP` › the address › `Email me a code`, and yield the code the
 * server issued for it. The newest held code is read BEFORE the send, so the
 * one yielded is the code this request produced.
 */
export function requestPortalCode(email: string): Cypress.Chainable<string> {
  const target: CodeTarget = { email };
  return cy.lastOtpIssuedAt('PORTAL_LOGIN', target).then((previous) => {
    cy.byTestId('continue-with-otp').should('contain.text', 'Login with OTP').click();
    cy.byTestId('otp-login-email').type(email);
    cy.interceptOperation('ConsoleRequestLoginOtp');
    cy.byTestId('recovery-send-code').should('contain.text', 'Email me a code').click();
    cy.wait('@ConsoleRequestLoginOtp');
    cy.byTestId('otp-login-code-sent')
      .should('be.visible')
      .and('contain.text', 'If that address can sign in here, a 6-digit code is on its way.');
    return cy.readOtp('PORTAL_LOGIN', target, previous);
  });
}

/** Type a code into the panel, press `Sign in` and wait for the server's answer. */
export function submitPortalCode(code: string): void {
  cy.byTestId('field-otp').type(code, { log: false });
  cy.interceptOperation('ConsoleOtpLogin');
  cy.byTestId('recovery-verify-code').should('contain.text', 'Sign in').click();
  cy.wait('@ConsoleOtpLogin');
}
