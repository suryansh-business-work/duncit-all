import type { CodeTarget } from './commands';

/**
 * The console login screen Partners mounts: @duncit/user-context's
 * LoginScreen + login.form (password) with @duncit/shell's OtpLoginPanel (code)
 * under it. Neither carries test ids, so these are the attributes and copy the
 * components render. Both email inputs share the placeholder `e-mail address`;
 * only the password form's has a `name`.
 */
export const loginPage = {
  email: () => cy.get('input[name="email"]'),
  password: () => cy.get('input[name="password"]'),
  submit: () => cy.get('button[type="submit"][aria-label="Sign in"]'),
  alert: (message: string) => cy.contains('[role="alert"]', message),
  codeEmail: () => cy.get('input[type="email"]:not([name])'),
  code: () => cy.get('input[aria-label="One-time code"]'),
  codeSignIn: () => cy.contains('button', /^Sign in$/),
};

/** Open the login page signed out. */
export function openLogin(): void {
  cy.clearAuth();
  cy.visitApp('/login');
}

/** Sign in with a password and wait for the server's answer. */
export function submitPassword(email: string, password: string): void {
  loginPage.email().clear().type(email);
  loginPage.password().clear().type(password, { log: false });
  cy.interceptOperation('PartnerLogin');
  loginPage.submit().click();
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
    cy.contains('button', 'Login with OTP').click();
    loginPage.codeEmail().type(email);
    cy.interceptOperation('ConsoleRequestLoginOtp');
    cy.contains('button', 'Email me a code').click();
    cy.wait('@ConsoleRequestLoginOtp');
    cy.contains('If that address can sign in here, a 6-digit code is on its way.').should('be.visible');
    return cy.readOtp('PORTAL_LOGIN', target, previous);
  });
}

/** Type a code into the panel, press `Sign in` and wait for the server's answer. */
export function submitPortalCode(code: string): void {
  loginPage.code().type(code, { log: false });
  cy.interceptOperation('ConsoleOtpLogin');
  loginPage.codeSignIn().click();
  cy.wait('@ConsoleOtpLogin');
}
