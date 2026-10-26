import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Support › Reported Problems › Configure Report a Problem
 * (/reported-problems/settings): what the app's Report a Problem form asks.
 *
 * That form is the platform's one shared configuration — every member's app
 * reads it — so the spec never saves. It proves the two rules the card enforces
 * on screen (screenshots off disables the limit; no categories disables Save)
 * and leaves, with nothing sent.
 */

describe('Support · Reported Problems (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, account.password('CHANGED'));
  });

  it('SRP-01 screenshots off disables Max screenshots, and removing every category disables Save — nothing is saved', () => {
    cy.interceptOperation('ReportProblemConfigForSupport');
    cy.visitPortal('support', '/reported-problems/settings');
    cy.wait('@ReportProblemConfigForSupport');
    cy.byTestId('page-header-title').should('have.text', 'Configure Report a Problem');
    const saves = countOperation('UpdateReportProblemConfig');

    // Whatever staging holds, the limit follows the switch both ways.
    cy.byTestId('problem-settings-allow-screenshots').find('input').check();
    cy.byTestId('problem-settings-max-screenshots').should('be.enabled');
    cy.byTestId('problem-settings-allow-screenshots').find('input').uncheck();
    cy.byTestId('problem-settings-max-screenshots').should('be.disabled');

    cy.byTestId('problem-settings-save').should('be.enabled');
    cy.byTestIdPrefix('problem-settings-category-remove').should('have.length.greaterThan', 0);
    // Remove them one by one, re-querying each time: the list re-renders on every removal.
    const removeAll = (): void => {
      cy.get('body').then(($body) => {
        const left = $body.find('[data-testid="problem-settings-category-remove"]');
        if (left.length === 0) return;
        cy.byTestIdPrefix('problem-settings-category-remove').first().click();
        removeAll();
      });
    };
    removeAll();
    cy.byTestId('problem-settings-category-remove').should('not.exist');
    cy.byTestId('problem-settings-save').should('be.disabled');
    expectNotSent(saves, 'UpdateReportProblemConfig');
  });
});
