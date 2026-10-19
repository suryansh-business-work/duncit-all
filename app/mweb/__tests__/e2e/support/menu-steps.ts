/// <reference types="cypress" />

/**
 * The account menu (/menu): the header avatar on Home opens it, and its tiles
 * (`sidebar-grid-<key>`) and the rows of its collapsible section cards
 * (`sidebar-section-<id>-toggle`, then `sidebar-item-<key>`) are how a member
 * reaches the support and pod-idea pages — so the specs arrive the same way.
 */

/** Home, signed in, then the header avatar. */
export function openMenu(): void {
  cy.visitApp('/');
  cy.byTestId('account-button').click();
  cy.location('pathname').should('eq', '/menu');
  cy.byTestId('menu-panel').should('be.visible');
}

/** A tile or row on the menu, and the page it leads to. A row lives in a
 * collapsed section card, so its `section` is opened first. */
export function openFromMenu(testId: string, pathname: string, section?: string): void {
  openMenu();
  if (section) cy.byTestId(`sidebar-section-${section}-toggle`).click();
  cy.byTestId(testId).click();
  cy.location('pathname').should('eq', pathname);
}
