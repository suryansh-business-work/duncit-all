describe('Duncit Marketing login', () => {
  it('redirects unauthenticated visitors to /login', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });

  it('shows the Duncit Marketing sign-in form', () => {
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
