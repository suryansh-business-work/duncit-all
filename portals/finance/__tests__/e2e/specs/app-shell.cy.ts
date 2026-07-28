import { baseMocks, noAccessUser } from '../support/fixtures';

/**
 * Route-guard + role-gate journey for the Finance shell (converted from the
 * Playwright `e2e/app.pw.ts`). Covers the three ways a visit can end: bounced
 * for having no token, rendered, or bounced for having no finance role.
 */

/**
 * The dashboard body only paints once `DashboardMe` resolves, and that query is
 * one of roughly half a dozen the shell fires on boot. Every one of them is
 * answered by a `cy.intercept` *function* handler, which round-trips to the
 * Cypress node process — on a loaded CI runner the whole boot burst regularly
 * outlives the 4s default command timeout even though the page is fine.
 */
const BOOT_TIMEOUT = 20000;

describe('App shell + auth', () => {
  it('signed-out visit to a protected route redirects to login', () => {
    // Empty map: every operation answers with the "no mock" error, so nothing
    // escapes to a real server even if the guard were to let the page render.
    cy.mockGraphql({});
    cy.visit('/payment-logs');
    cy.location('pathname').should('eq', '/login');
    // The guard must preserve where the user was headed.
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/payment-logs')}`);
  });

  it('authed dashboard renders the welcome + role chip', () => {
    cy.mockGraphql(baseMocks());
    cy.visitAuthed('/');
    cy.contains(/Welcome back/, { timeout: BOOT_TIMEOUT }).should('be.visible');
    // `WelcomeDashboard` renders one chip per role with underscores stripped.
    cy.contains('FINANCE MANAGER').should('be.visible');
    cy.location('pathname').should('eq', '/');
  });

  it('a user without the finance role is bounced to login (denied)', () => {
    cy.mockGraphql(baseMocks(noAccessUser));
    cy.visitAuthed('/');
    cy.location('pathname', { timeout: BOOT_TIMEOUT }).should('eq', '/login');
    cy.location('search').should('contain', 'denied=1');
    // `onDenied` clears the token, so the session cannot survive the bounce.
    cy.window().its('localStorage').invoke('getItem', 'finance_token').should('be.null');
  });
});
