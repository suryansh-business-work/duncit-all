import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Pod settings (/pod-settings): platform-wide pod rules. They are
 * global and shared by every pod on staging, and appSettings is refused to
 * ALL_PODS_ACCESS, so nothing is saved: the spec proves each card's own bound
 * (the warning, and Save staying off) before anything could be sent.
 */

const RISK_WINDOW = 'pod-setting-risk-window';
const DISCOUNT_MAX = 'pod-setting-ticket-discount-max';
const SLOT_WINDOW = 'pod-setting-auto-pod-slot-window';

/** Type a value into a card and see its warning, with Save off. */
function expectOutOfRange(card: string, value: string, warning: string): void {
  cy.byTestId(`${card}-input`).clear().type(value, { delay: 0 });
  cy.byTestId(`${card}-warning`).should('have.text', warning);
  cy.byTestId(`${card}-save`).should('be.disabled');
}

describe('Pods Portal · Pod settings (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  it('PST-01 out-of-range values show each card’s bound and keep its Save off', () => {
    cy.visitPortal('pods', '/pod-settings');
    cy.byTestId('pod-settings-title').should('have.text', 'Pod Settings');
    const saves = countOperation('UpdatePodSettings');
    expectOutOfRange(RISK_WINDOW, '9000', 'Enter a whole number between 1 and 8760.');
    expectOutOfRange(DISCOUNT_MAX, '200', 'Enter a whole number between 1 and 99.');
    expectOutOfRange(SLOT_WINDOW, '90', 'Enter a whole number between 1 and 60.');
    expectOutOfRange(RISK_WINDOW, '0', 'Enter a whole number between 1 and 8760.');
    expectNotSent(saves, 'UpdatePodSettings');
  });
});
