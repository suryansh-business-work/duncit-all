import type { RunAccount } from '../../support/run-account';
import { runPasswordNow } from '../../support/ui-shell';
import { openTable } from '../../support/tables';
import { downloaded, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Tables (@duncit/table's toolbar), on Support › Reported
 * Problems (`support-reported-problems`, backed by `reportedProblemsTable`):
 * Download saves the page on screen as JSON and CSV named
 * `<tableId>-page-<n>.<ext>`, and the GET API dialog builds the URL for the same
 * query — with the person's own table token, or a placeholder and the
 * instruction to make one when they have none.
 *
 * Not driven: Table change logs, which need a row edited through a grid.
 */

const TABLE = 'support-reported-problems';
const OPERATION = 'ReportedProblemsTable';

interface Row {
  id: string;
}

describe('Portal Shell · Tables (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('TB-01 Download saves the page on screen as JSON and as CSV', () => {
    cy.interceptOperation(OPERATION);
    cy.visitPortal('support', '/reported-problems');
    cy.wait(`@${OPERATION}`).then(({ response }) => {
      const rows = (response?.body.data as { reportedProblemsTable: { rows: Row[] } }).reportedProblemsTable.rows;
      if (rows.length === 0) throw new Error('Reported Problems has no rows on staging to download.');
      cy.byTestId('table-toolbar-download').should('be.enabled').click();
      cy.byTestId('table-download-page-json').click();
      cy.readFile(downloaded(`${TABLE}-page-1.json`)).should((saved: Row[]) => {
        expect(saved.map((row) => row.id)).to.deep.equal(rows.map((row) => row.id));
        expect(JSON.stringify(saved)).to.not.contain('__typename');
      });
      cy.byTestId('table-toolbar-download').click();
      cy.byTestId('table-download-page-csv').click();
      cy.readFile(downloaded(`${TABLE}-page-1.csv`)).should((text: string) => {
        const header = text.replace(/^﻿/, '').split('\r\n')[0];
        expect(header, 'a header row').to.not.be.empty;
        expect(text.split('\r\n').length, 'a line per row after the header').to.be.at.least(rows.length + 1);
      });
    });
  });

  it('TB-02 the GET API dialog builds the URL for the query on screen, with the token or the instruction to make one', () => {
    openTable('support', '/reported-problems', OPERATION);
    cy.interceptOperation('MyTableApiAccess');
    cy.byTestId('table-toolbar-get-api').click();
    cy.byTestId('table-api-dialog').should('contain.text', 'GET API');
    cy.wait('@MyTableApiAccess').then(({ response }) => {
      const access = (response?.body.data as { myTableApiAccess: { token: string | null; base_url: string } }).myTableApiAccess;
      cy.byTestId('table-api-url')
        .invoke('text')
        .then((text) => {
          const url = new URL(text.replace(/^GET /, ''));
          expect(`${url.origin}${url.pathname}`).to.equal(`${access.base_url}/reportedProblemsTable`);
          expect(url.searchParams.get('page')).to.equal('1');
          if (access.token) {
            expect(url.searchParams.get('token')).to.equal(access.token);
            cy.byTestId('table-api-dialog').should('contain.text', 'This URL carries your personal token. Treat it like a password.');
            cy.request({ url: url.toString(), log: false }).its('status').should('eq', 200);
          } else {
            expect(url.searchParams.get('token')).to.equal('YOUR_TOKEN');
            cy.byTestId('table-api-dialog').should(
              'contain.text',
              'You do not have a table API token yet. Generate one in Tech portal → Table API → Settings, then reopen this dialog.',
            );
          }
        });
    });
  });
});
