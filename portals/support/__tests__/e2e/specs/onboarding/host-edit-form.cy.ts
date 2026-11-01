import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, wideViewport } from '../../support/ui-staff';
import { firstRow, onboardingAccount, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Host Edit Form: the Edit Host dialog on Onboarded Hosts
 * (/hosts → HostEditDialog with HostAccordionForm, React Hook Form + Zod
 * forms/host/host.form.ts).
 *
 * Every host is a real applicant, so the dialog is never saved: each scenario
 * drives the form to the rule that stops Save and proves UpdateHost (the
 * adminUpdateHost mutation) was never sent, then cancels. The run account
 * holds ONBOARDING_MANAGER for the spec (ui-onboarding.ts).
 */

const TABLE = 'onboarding-hosts';
const HOSTS = 'HostsTable';
const UPDATE = 'UpdateHost';

const dialog = () => cy.contains('[role="dialog"]', 'Edit Host');

/** A dialog field by its visible label — MUI ties the <label> to its input with `for`. */
const field = (label: string) =>
  dialog()
    .contains('label', label)
    .invoke('attr', 'for')
    .then((id) => cy.get(`[id="${String(id)}"]`));

/** Onboarded Hosts, wide, with the first host's Edit dialog open. */
function openEdit(): void {
  wideViewport();
  cy.interceptOperation(HOSTS);
  cy.visitPortal('onboarding', '/hosts');
  firstRow<{ id: string }>(HOSTS, 'hostsTable', 'onboarded host').then((host) => {
    cy.byTestId(`${TABLE}-row-${host.id}`).within(() => cy.get('button[aria-label="Edit"]').click());
  });
  dialog().should('be.visible');
}

describe('Onboarding · Host Edit Form (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = onboardingAccount();
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('HEF-01 Expand all opens every section and turns into Collapse all; Cancel closes without saving', () => {
    const updates = countOperation(UPDATE);
    openEdit();
    dialog().contains('button', 'Expand all').click();
    dialog().contains('button', 'Collapse all').should('be.visible');
    field('Aadhar number').should('be.visible');
    field('PAN number').should('be.visible');
    dialog().contains('button', 'Collapse all').click();
    dialog().contains('button', 'Expand all').should('be.visible');
    dialog().contains('button', 'Cancel').click();
    cy.contains('[role="dialog"]', 'Edit Host').should('not.exist');
    expectNotSent(updates, UPDATE);
  });

  it('HEF-02 a blank or malformed name and a malformed email are refused on Save, and nothing is sent', () => {
    const updates = countOperation(UPDATE);
    openEdit();
    field('Full name').clear();
    dialog().contains('button', /^Save$/).click();
    dialog().should('contain.text', 'Full name is required');
    field('Full name').type('J0hn', { delay: 0 });
    dialog().should('contain.text', 'Full name can use letters, spaces, apostrophes, periods and hyphens only');
    field('Email').clear().type('not-an-email', { delay: 0 });
    dialog().contains('button', /^Save$/).click();
    dialog().should('contain.text', 'Enter a valid email');
    dialog().should('be.visible');
    dialog().contains('button', 'Cancel').click();
    expectNotSent(updates, UPDATE);
  });

  it('HEF-03 an Aadhar that is not 12 digits and a PAN off the ABCDE1234F format are refused on Save', () => {
    const updates = countOperation(UPDATE);
    openEdit();
    dialog().contains('button', 'Expand all').click();
    field('Aadhar number').clear().type('1234', { delay: 0 });
    field('PAN number').clear().type('ABC123', { delay: 0 });
    dialog().contains('button', /^Save$/).click();
    dialog().should('contain.text', 'Aadhar must be a 12 digit number');
    dialog().should('contain.text', 'PAN must use format ABCDE1234F');
    dialog().contains('button', 'Cancel').click();
    expectNotSent(updates, UPDATE);
  });
});
