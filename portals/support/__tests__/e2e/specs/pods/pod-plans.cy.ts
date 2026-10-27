import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Pod plans (/pod-plans): the New plan dialog's own rules (React
 * Hook Form + Zod), proven before anything is sent. Creating, editing and
 * deleting a plan are writes the server keeps from ALL_PODS_ACCESS — and a plan
 * is shown in mWeb — so none is saved here.
 */

describe('Pods Portal · Pod plans (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  it('PPL-01 New plan refuses a bad key, a blank name, a non-URL image and a sort order outside 0–999', () => {
    cy.interceptOperation('PodPlansTable');
    cy.visitPortal('pods', '/pod-plans');
    cy.wait('@PodPlansTable').its('response.body.errors').should('be.undefined');
    cy.byTestId('pod-plans-title').should('have.text', 'Pod Plans');

    cy.byTestId('pod-plan-new').click();
    cy.byTestId('pod-plan-dialog').should('contain.text', 'New plan');
    const creates = countOperation('CreatePodPlan');

    cy.byTestId('pod-plan-key').type('Premium Plan!', { delay: 0 }).blur();
    cy.byTestId('pod-plan-form').should('contain.text', 'Key may contain lowercase letters, digits, dashes and underscores');
    cy.byTestId('pod-plan-name').type('x').clear().blur();
    cy.byTestId('pod-plan-form').should('contain.text', 'Name is required');
    cy.byTestId('pod-plan-image-url').type('not a url', { delay: 0 }).blur();
    cy.byTestId('pod-plan-form').should('contain.text', 'Image URL must be a valid http(s) URL');
    cy.byTestId('pod-plan-sort').clear().type('1000', { delay: 0 }).blur();
    cy.byTestId('pod-plan-form').should('contain.text', 'Sort order must be 999 or fewer');
    cy.byTestId('pod-plan-sort').clear().type('-1', { delay: 0 }).blur();
    cy.byTestId('pod-plan-form').should('contain.text', 'Sort order must be 0 or greater');

    cy.byTestId('pod-plan-submit').should('have.text', 'Create plan').click();
    cy.byTestId('pod-plan-dialog').should('be.visible');
    expectNotSent(creates, 'CreatePodPlan');
  });
});
