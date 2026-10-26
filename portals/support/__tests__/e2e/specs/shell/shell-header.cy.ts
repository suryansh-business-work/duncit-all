import type { RunAccount } from '../../support/run-account';
import { openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Shell header: the search suggestions name each page's
 * section and path, the xs search overlay replaces the header and gives it
 * back, and the colour mode a second console (Legal) keeps is its own.
 */

describe('Portal Shell · Shell header (Support and Legal, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  it('SH-01 suggestions show each matching page with its section and path; nothing matching says so', () => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.byTestId('shell-header-search').type('FAQ');
    cy.byTestId('shell-header-search-option-/faqs').should('contain.text', 'App FAQs').and('contain.text', 'FAQs · /faqs');
    cy.byTestId('shell-header-search-option-/partners/faqs')
      .should('contain.text', 'Partner FAQs')
      .and('contain.text', 'FAQs · /partners/faqs');
    cy.byTestId('shell-header-search-option-/faqs/submissions').should('contain.text', 'FAQs · /faqs/submissions');
    cy.byTestId('shell-header-search-option-/tickets').should('not.exist');

    // A top-level page has no section: just its path.
    cy.byTestId('shell-header-search').clear().type('Tickets');
    cy.byTestId('shell-header-search-option-/tickets').should('contain.text', 'Tickets').and('not.contain.text', '·');

    cy.byTestId('shell-header-search').clear().type('zz-no-page-zz');
    cy.get('.MuiAutocomplete-noOptions').should('have.text', 'No matches');
  });

  it('SH-02 on a phone the search opens as a header overlay with focus in it, and closing it brings the header back', () => {
    cy.viewport(390, 844);
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.byTestId('shell-header-brand').should('be.visible');
    cy.byTestId('shell-header-open-search').click();
    cy.byTestId('shell-header-close-search').should('be.visible');
    cy.byTestId('shell-header-brand').should('not.exist');
    cy.focused().should('have.attr', 'data-testid', 'shell-header-search');

    cy.byTestId('shell-header-search').type('Tickets');
    cy.byTestId('shell-header-search-option-/tickets').click();
    cy.location('pathname').should('eq', '/tickets');
    // Picking a result closes the overlay too.
    cy.byTestId('shell-header-brand').should('be.visible');

    cy.byTestId('shell-header-open-search').click();
    cy.byTestId('shell-header-close-search').click();
    cy.byTestId('shell-header-brand').should('be.visible');
    cy.byTestId('shell-header-close-search').should('not.exist');
  });

  it('SH-03 Legal keeps its own colour mode under legal_color_mode', () => {
    cy.apiPortalLogin('legal', account.email, runPasswordNow(account));
    openSignedIn('legal', '/');
    cy.window().its('localStorage').invoke('getItem', 'legal_color_mode').should('equal', null);
    cy.byTestId('shell-header-color-mode').click();
    cy.window().its('localStorage').invoke('getItem', 'legal_color_mode').should('eq', 'light');
    cy.window().its('localStorage').invoke('getItem', 'support_color_mode').should('equal', null);
    cy.reload();
    cy.byTestId('shell-header-color-mode').find('[data-testid="DarkModeIcon"]').should('exist');
  });
});
