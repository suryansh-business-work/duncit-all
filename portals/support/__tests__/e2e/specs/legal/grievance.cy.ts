import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Legal › Grievance › Grievance Info (/grievance/info): the Grievance Officer
 * the app and the websites publish. That record is the platform's one public
 * officer, so the spec never saves it — it proves the form's own rules
 * (React Hook Form + Zod) refuse a bad entry before anything is sent, and
 * leaves without saving. Publishing a new officer is not automated on staging.
 */

describe('Legal · Grievance (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
  });

  it('GRV-01 the officer form refuses a blank name, an invalid email and a short phone, and sends nothing', () => {
    cy.interceptOperation('GrievanceOfficer');
    cy.visitPortal('legal', '/grievance/info');
    cy.wait('@GrievanceOfficer');
    cy.byTestId('page-header-title').should('have.text', 'Grievance Info');

    const saves = countOperation('SaveGrievanceOfficer');
    cy.byTestId('grievance-officer-name').clear().type('x').clear().blur();
    cy.byTestId('grievance-officer-form').should('contain.text', 'Name is required');
    cy.byTestId('grievance-officer-email').clear().type('abc', { delay: 0 }).blur();
    cy.byTestId('grievance-officer-form').should('contain.text', 'Enter a valid email address');
    cy.byTestId('grievance-officer-phone').clear().type('12', { delay: 0 }).blur();
    cy.byTestId('grievance-officer-form').should('contain.text', 'Enter a valid phone number');

    // The form is dirty now, so Save is live — and the schema still stops it.
    cy.byTestId('grievance-officer-save').should('be.enabled').click();
    cy.byTestId('grievance-officer-name').should('have.attr', 'aria-invalid', 'true');
    cy.byTestId('grievance-officer-email').should('have.attr', 'aria-invalid', 'true');
    cy.byTestId('grievance-officer-phone').should('have.attr', 'aria-invalid', 'true');
    expectNotSent(saves, 'SaveGrievanceOfficer');
  });
});
