import { assertInsideShell, openLogin, submitPassword } from '../support/login-page';
import { GRIEVANCES_LOOKUP } from '../support/operations';
import { runAccount, type RunAccount } from '../support/run-account';
import { openRow, openTable, searchTable } from '../support/tables';

/**
 * Legal portal, on its own origin (LEGAL_URL): the grievance the mWeb member
 * raised, found in Grievance › Grievance Tickets by its subject and read in the
 * Grievance dialog. Signed in as the run account (password CHANGED), which
 * `01-support-portal` granted LEGAL_MANAGER.
 *
 * The dialog is only read and closed — its status is the Legal team's answer
 * to a real complaint, and the run has no answer to give.
 */

interface Grievance {
  id: string;
  grievance_no: string;
  subject: string;
  description: string;
}

const findGrievance = (marker: string) =>
  cy
    .gql<{ grievanceTicketsTable: { rows: Grievance[] } }>(GRIEVANCES_LOOKUP, {
      query: { search: marker, page: 1, page_size: 10 },
    })
    .then((data) => {
      expect(data.grievanceTicketsTable.rows, `the grievance carrying ${marker}`).to.have.length.greaterThan(0);
      return data.grievanceTicketsTable.rows[0];
    });

describe('Legal portal · the grievance the mWeb member raised (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = runAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
  });

  it('LG-01 the run account signs in to Legal with its password and lands inside the shell', () => {
    openLogin('legal');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('legal');
  });

  it('LG-02 Grievance › Grievance Tickets finds the grievance by Subject, and its row opens the Grievance dialog', () => {
    const marker = account.mwebMarker;
    findGrievance(marker).then((grievance) => {
      openTable('legal', '/grievance/tickets', 'GrievanceTicketsTable');
      cy.byTestId('page-header-title').should('have.text', 'Grievance Tickets');
      searchTable('GrievanceTicketsTable', marker);
      openRow('legal-grievance-tickets', grievance.id, [grievance.grievance_no, grievance.subject]);

      cy.byTestId('grievance-dialog').should('be.visible');
      cy.byTestId('grievance-dialog-title').should('contain.text', 'Grievance');
      cy.byTestId('grievance-dialog-no').should('have.text', grievance.grievance_no);
      cy.byTestId('grievance-dialog-subject').should('have.text', grievance.subject);
      cy.byTestId('grievance-dialog-description').should('contain.text', marker);

      cy.byTestId('grievance-dialog-close').should('contain.text', 'Close').click();
      cy.byTestId('grievance-dialog').should('not.exist');
    });
  });
});
