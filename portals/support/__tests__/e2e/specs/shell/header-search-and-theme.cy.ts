import type { RunAccount } from '../../support/run-account';
import { openSignedIn, runPasswordNow, visibleTestId } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Header, search and theme, on Support: the header search
 * (HeaderSearch) lists every nav leaf and navigates to the one picked, owns the
 * "/" shortcut unless the person is already typing, the colour mode toggle is
 * kept under the console's own colorModeKey, and the brand title goes home.
 */

describe('Portal Shell · Header, search and theme (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('HST-01 picking a search result navigates there and clears the box', () => {
    openSignedIn('support', '/');
    cy.byTestId('shell-header-search').type('Submissions');
    cy.byTestId('shell-header-search-option-/faqs/submissions').should('contain.text', 'FAQ Submissions').click();
    cy.location('pathname').should('eq', '/faqs/submissions');
    cy.byTestId('shell-header-search').should('have.value', '');
  });

  it('HST-02 "/" focuses the header search, but is typed as a slash inside another field', () => {
    openSignedIn('support', '/');
    cy.get('body').type('/');
    cy.focused().should('have.attr', 'data-testid', 'shell-header-search');
    cy.byTestId('shell-header-search').should('have.value', '');

    visibleTestId('shell-nav-search').click().type('a/b');
    visibleTestId('shell-nav-search').should('have.value', 'a/b');
    cy.focused().should('have.attr', 'data-testid', 'shell-nav-search');
  });

  it('HST-03 the mode toggle switches the console and is remembered under support_color_mode', () => {
    openSignedIn('support', '/');
    // DuncitThemeProvider starts dark; the toggle shows the mode it would switch to.
    cy.byTestId('shell-header-color-mode').find('[data-testid="LightModeIcon"]').should('exist');
    cy.byTestId('shell-header-color-mode').click();
    cy.byTestId('shell-header-color-mode').find('[data-testid="DarkModeIcon"]').should('exist');
    cy.window().its('localStorage').invoke('getItem', 'support_color_mode').should('eq', 'light');
    cy.reload();
    cy.byTestId('shell-header-color-mode').find('[data-testid="DarkModeIcon"]').should('exist');
  });

  it('HST-04 the product name in the header returns to the dashboard', () => {
    openSignedIn('support', '/tickets');
    cy.byTestId('shell-header-brand').should('have.text', 'Duncit Support').click();
    cy.location('pathname').should('eq', '/');
    cy.byTestId('page-header-title').should('have.text', 'Support Dashboard');
  });
});
