import type { RunAccount } from '../../support/run-account';
import { navGroup, navLeaf, openSignedIn, runPasswordNow, visibleTestId } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Sidebar navigation, on Support's nav (config/app-config.ts):
 * leaves route and light up, groups (FAQs, Reported Problems) open and close,
 * the "Search menu…" box filters the tree, and Expand all / Collapse all
 * re-syncs every group, including ones opened by hand.
 */

describe('Portal Shell · Sidebar navigation (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('SN-01 a leaf routes and is the one current item; a group opens and stays open on its child page', () => {
    openSignedIn('support', '/');
    navLeaf('Tickets').click();
    cy.location('pathname').should('eq', '/tickets');
    navLeaf('Tickets').should('have.attr', 'aria-current', 'page').and('have.class', 'Mui-selected');
    navLeaf('Dashboard').should('not.have.attr', 'aria-current', 'page');

    navGroup('FAQs').should('have.attr', 'aria-expanded', 'false');
    navLeaf('FAQ Submissions').should('not.exist');
    navGroup('FAQs').click().should('have.attr', 'aria-expanded', 'true');
    navLeaf('FAQ Submissions').click();
    cy.location('pathname').should('eq', '/faqs/submissions');
    navGroup('FAQs').should('have.attr', 'aria-expanded', 'true');
    // The longest-prefix child wins: App FAQs (/faqs) is not lit beside it.
    navLeaf('FAQ Submissions').should('have.attr', 'aria-current', 'page');
    navLeaf('App FAQs').should('not.have.attr', 'aria-current', 'page');
    navLeaf('Tickets').should('not.have.attr', 'aria-current', 'page');
  });

  it('SN-02 the menu search narrows the tree to matches and opens their groups; no match says so', () => {
    openSignedIn('support', '/');
    visibleTestId('shell-nav-search').should('have.attr', 'placeholder', 'Search menu…').type('Submissions');
    navLeaf('FAQ Submissions').should('be.visible');
    cy.get('[data-testid="shell-nav-leaf"]:visible').should('have.length', 1);
    navGroup('FAQs').should('have.attr', 'aria-expanded', 'true');

    visibleTestId('shell-nav-search').clear().type('zz-nothing-zz');
    cy.get('[data-testid="shell-nav-leaf"]:visible').should('not.exist');
    cy.contains('[data-testid="shell-sidebar"]:visible', 'No menu items match.').should('exist');
    visibleTestId('shell-nav-search').clear();
    navLeaf('Dashboard').should('be.visible');
  });

  it('SN-03 Expand all opens every group; Collapse all closes every group, even one opened by hand', () => {
    openSignedIn('support', '/');
    navGroup('Reported Problems').click().should('have.attr', 'aria-expanded', 'true');
    navGroup('FAQs').should('have.attr', 'aria-expanded', 'false');
    visibleTestId('shell-nav-expand-all').should('have.text', 'Expand all').click();
    cy.get('[data-testid="shell-nav-group"]:visible').each(($group) => expect($group).to.have.attr('aria-expanded', 'true'));
    visibleTestId('shell-nav-expand-all').should('have.text', 'Collapse all').click();
    cy.get('[data-testid="shell-nav-group"]:visible').each(($group) => expect($group).to.have.attr('aria-expanded', 'false'));
    visibleTestId('shell-nav-expand-all').should('have.text', 'Expand all');
  });
});
