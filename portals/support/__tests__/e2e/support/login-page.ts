import { portalTokenKey, type StaffPortal } from './portals';

/**
 * The console login screen every staff portal mounts: @duncit/shell's
 * PortalLoginPage around @duncit/user-context's LoginScreen, posting
 * `ConsoleLogin`. Every element is found by its test id — the same ids the
 * Partners suite reads, because it is the same screen.
 */

/** Open the portal's login page signed out. */
export function openLogin(portal: StaffPortal): void {
  cy.clearAuth();
  cy.visitPortal(portal, '/login');
  cy.byTestId('login-screen').should('be.visible');
}

/** Sign in with a password and wait for the server to accept it. */
export function submitPassword(email: string, password: string): void {
  cy.byTestId('field-email').clear().type(email);
  cy.byTestId('field-password').clear().type(password, { log: false });
  cy.interceptOperation('ConsoleLogin');
  cy.byTestId('login-submit').click();
  cy.wait('@ConsoleLogin').its('response.body.errors').should('be.undefined');
}

/** The dashboard at `/`, inside the shell's chrome, with the session saved where the portal reads it. */
export function assertInsideShell(portal: StaffPortal): void {
  cy.location('pathname').should('eq', '/');
  cy.byTestId('shell-user-menu-button').should('be.visible');
  cy.window().its('localStorage').invoke('getItem', portalTokenKey(portal)).should('be.a', 'string').and('not.be.empty');
}
