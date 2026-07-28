import { baseMocks, noAccessUser } from '../support/fixtures';

/**
 * Route-guard + role-gate journey for the CRM shell (converted from the
 * Playwright `e2e/app.pw.ts`). Covers the three ways a visit to `/` can end:
 * bounced for having no token, rendered, or bounced for having no CRM role.
 */
describe('App shell + auth', () => {
  it('signed-out visit to a protected route redirects to login', () => {
    // Empty map: every operation answers with the "no mock" error, so nothing
    // escapes to a real server even if the guard were to let the page render.
    cy.mockGraphql({});
    cy.visit('/venue-leads');
    cy.location('pathname').should('eq', '/login');
    // The guard must preserve where the user was headed.
    cy.location('search').should('eq', `?redirect=${encodeURIComponent('/venue-leads')}`);
  });

  it('authed dashboard renders without redirecting away', () => {
    cy.mockGraphql(baseMocks());
    cy.visitAuthed('/');
    cy.contains(/crm dashboard/i, { timeout: 10000 }).should('be.visible');
    cy.location('pathname').should('eq', '/');
    cy.location('search').should('not.contain', 'denied');
  });

  it('a user without the CRM role is bounced to login (denied)', () => {
    cy.mockGraphql({ ...baseMocks(), SessionMe: { data: { me: noAccessUser } } });
    cy.visitAuthed('/');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('contain', 'denied=1');
    // `onDenied` clears the token, so the session cannot survive the bounce.
    cy.window().its('localStorage').invoke('getItem', 'crm_token').should('be.null');
  });
});
