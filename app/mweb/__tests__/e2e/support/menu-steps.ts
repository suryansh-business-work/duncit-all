/// <reference types="cypress" />

/**
 * The account menu (/menu): the header avatar on Home opens it, and its tiles
 * (`sidebar-grid-<key>`) and rows (`sidebar-item-<label>`) are how a member
 * reaches the support and pod-idea pages — so the specs arrive the same way.
 */

/** Home, signed in, then the header avatar. */
export function openMenu(): void {
  cy.visitApp('/');
  cy.byTestId('account-button').click();
  cy.location('pathname').should('eq', '/menu');
  cy.byTestId('menu-panel').should('be.visible');
}

/** A tile or row on the menu, and the page it leads to. */
export function openFromMenu(testId: string, pathname: string): void {
  openMenu();
  cy.byTestId(testId).click();
  cy.location('pathname').should('eq', pathname);
}
