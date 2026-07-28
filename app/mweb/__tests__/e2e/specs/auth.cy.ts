/// <reference types="cypress" />

describe('Auth', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.mockGraphql({});
    cy.clearAuth();
  });

  it('signed-out visit to home redirects to login with the form', () => {
    cy.visitApp('/');
    cy.location('pathname').should('match', /\/login/);
    cy.fieldByLabel('Email').should('be.visible').and('have.attr', 'name', 'email');
    cy.fieldByLabel('Password').should('be.visible').and('have.attr', 'name', 'password');
    cy.contains('button', 'Log me in').should('be.visible');
  });

  it('shows required + invalid email validation', () => {
    cy.visitApp('/login');
    cy.contains('button', 'Log me in').click();
    cy.contains('Email is required').should('be.visible');

    cy.fieldByLabel('Email').type('not-an-email');
    cy.contains('button', 'Log me in').click();
    cy.contains('Enter a valid email').should('be.visible');
  });

  it('links to forgot-password and register', () => {
    cy.visitApp('/login');
    cy.contains('a', 'Forgot password?').click();
    cy.location('pathname').should('match', /forgot-password/);

    cy.visitApp('/login');
    cy.contains('a', 'Create one').click();
    cy.location('pathname').should('match', /register/);
  });
});
