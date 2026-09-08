/** The console's front door. Everything else in this portal is behind it. */
const EMAIL = Cypress.env('E2E_EMAIL') || 'admin@duncit.com';
const WRONG_SECRET = Cypress.env('E2E_WRONG_SECRET') || 'not-the-password';

describe('Duncit Regional Club Admin login', () => {
  it('redirects unauthenticated visitors to /login', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('include', 'redirect=');
  });

  it('shows the Regional Club Admin sign-in form', () => {
    cy.visit('/login');
    cy.contains(/log in/i).should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('surfaces a server-side error on invalid credentials', () => {
    cy.mockGraphql({
      ConsoleLogin: {
        errors: [{ message: 'Invalid email or password', extensions: { code: 'UNAUTHENTICATED' } }],
      },
    });
    cy.visit('/login');
    cy.get('input[name="email"]').clear().type(EMAIL);
    cy.get('input[name="password"]').clear().type(WRONG_SECRET, { log: false });
    cy.get('button[type="submit"]').click();
    cy.contains(/invalid email or password/i, { timeout: 8000 }).should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });
});
