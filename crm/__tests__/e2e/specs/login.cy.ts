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
    cy.findByLabelLike(/email/i).should('be.visible');
    cy.findByLabelLike(/password/i).should('be.visible');
    cy.contains('button', /open crm console/i).should('be.visible');
  });

  it('surfaces a server-side error on invalid credentials', () => {
    cy.mockGraphql({ ConsoleLogin: loginInvalid });
    cy.visit('/login');
    cy.findByLabelLike(/email/i).type('admin@duncit.com');
    cy.findByLabelLike(/password/i).type('wrong-pass');
    cy.contains('button', /open crm console/i).click();
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
