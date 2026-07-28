/**
 * Login journey for the Finance console. `LoginPage` is the shared
 * `@duncit/shell` `PortalLoginPage`, so this covers the `ConsoleLogin` mutation
 * wiring and the error surface rather than the markup.
 *
 * Every test stubs GraphQL first — the same contract the rest of the suite
 * follows — so no request can escape to a real server.
 */
describe('Duncit Finance login', () => {
  it('redirects unauthenticated visitors to /login', () => {
    cy.mockGraphql({});
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('include', 'redirect=');
  });

  it('shows the Duncit Finance sign-in form', () => {
    cy.mockGraphql({});
    cy.visit('/login');
    cy.contains(/log in/i).should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('surfaces a server-side error on invalid credentials', () => {
    cy.mockGraphql({
      ConsoleLogin: { errors: [{ message: 'Invalid email or password', extensions: { code: 'UNAUTHENTICATED' } }] },
    });
    cy.visit('/login');
    cy.get('input[name="email"]').clear().type('admin@duncit.com');
    cy.get('input[name="password"]').clear().type('wrong-pass', { log: false });
    cy.get('button[type="submit"]').click();
    cy.contains(/invalid email or password/i, { timeout: 8000 }).should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });
});
