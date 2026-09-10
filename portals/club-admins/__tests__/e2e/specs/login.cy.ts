describe('Duncit Club Admins login', () => {
  it('redirects unauthenticated visitors to /login', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });

  it('shows the Duncit Club Admins sign-in form', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });
});
