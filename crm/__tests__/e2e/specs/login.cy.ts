import { baseMocks, loginInvalid, loginSuccess } from '../support/fixtures';

describe('CRM login', () => {
  it('redirects unauthenticated visitors to /login', () => {
    cy.visit('/venue-leads');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('include', 'redirect=');
  });

  it('shows the admin@duncit.com sign-in form', () => {
    cy.visit('/login');
    cy.contains(/sign in to duncit crm/i).should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('surfaces a server-side error on invalid credentials', () => {
    cy.mockGraphql({ ConsoleLogin: loginInvalid });
    cy.visit('/login');
    cy.get('input[name="email"]').clear().type('admin@duncit.com');
    cy.get('input[name="password"]').clear().type('wrong-pass', { log: false });
    cy.get('button[type="submit"]').click();
    cy.contains(/invalid email or password/i, { timeout: 8000 }).should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('logs in with admin@duncit.com / 12345678 and lands on the dashboard', () => {
    cy.mockGraphql({
      ...baseMocks(),
      ConsoleLogin: loginSuccess,
    });
    cy.login();
    cy.location('pathname').should('eq', '/');
    cy.contains(/crm dashboard/i, { timeout: 10000 }).should('be.visible');
  });
});
