import { openLogin, submitPassword } from '../../support/login-page';
import type { RunAccount } from '../../support/run-account';
import { runPasswordNow } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Auth (console login): the bounce through `?redirect=` keeps
 * the whole location (path and query), and the login card's "Other portals"
 * launcher (OtherPortalsDialog) lists, searches and filters every console.
 * Driven on Support; the HR deep link of the catalogue is not served in CI, so
 * a Support deep link with a query string stands in for it.
 */

/** The categories `PORTAL_CATEGORIES` offers, in order, as session.portals.categories words them. */
const CATEGORY_CHIPS: readonly [string, string][] = [
  ['operations', 'Operations'],
  ['growth', 'Growth'],
  ['contentAi', 'Content & AI'],
  ['people', 'People'],
  ['partners', 'Partners'],
];

describe('Portal Shell · Auth (console login) (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  it('ACL-01 a signed-out deep link with a query string bounces to /login with it encoded, and returns there', () => {
    const target = '/tickets?status=OPEN';
    cy.clearAuth();
    cy.visitPortal('support', target);
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent(target)}`);
    cy.byTestId('login-screen').should('be.visible');
    submitPassword(account.email, runPasswordNow(account));
    cy.location('pathname').should('eq', '/tickets');
    cy.location('search').should('eq', '?status=OPEN');
  });

  it('ACL-02 Other portals opens with its subtitle, search box and the category chips', () => {
    openLogin('support');
    cy.byTestId('login-other-portals').should('have.text', 'Other portals').click();
    cy.byTestId('other-portals-dialog')
      .should('contain.text', 'Other portals')
      .and('contain.text', 'One Duncit account — jump to any console below.');
    cy.byTestId('other-portals-chip-all').should('have.text', 'All').and('have.attr', 'aria-pressed', 'true');
    for (const [key, label] of CATEGORY_CHIPS) {
      cy.byTestId(`other-portals-chip-${key}`).should('have.text', label).and('have.attr', 'aria-pressed', 'false');
    }
    cy.byTestId('other-portals-search').should('be.visible');
  });

  it('ACL-03 a category chip narrows the list to its consoles, and the search matches names and descriptions', () => {
    openLogin('support');
    cy.byTestId('login-other-portals').click();
    cy.byTestId('other-portals-chip-people').click().should('have.attr', 'aria-pressed', 'true');
    // portals.ts: Onboarding, HR and Employee are the People consoles.
    cy.byTestIdPrefix('other-portals-card-').should('have.length', 3);
    for (const key of ['onboarding', 'hr', 'employee']) cy.byTestId(`other-portals-card-${key}`).should('exist');

    cy.byTestId('other-portals-chip-all').click();
    // "reconciliation" is only in Finance's description.
    cy.byTestId('other-portals-search').type('reconciliation');
    cy.byTestIdPrefix('other-portals-card-').should('have.length', 1);
    cy.byTestId('other-portals-card-finance').should('contain.text', 'Finance');

    cy.byTestId('other-portals-search').clear().type('zz-no-console-zz');
    cy.byTestIdPrefix('other-portals-card-').should('not.exist');
    cy.byTestId('other-portals-dialog').should('contain.text', 'No portals match “zz-no-console-zz”.');
  });
});
