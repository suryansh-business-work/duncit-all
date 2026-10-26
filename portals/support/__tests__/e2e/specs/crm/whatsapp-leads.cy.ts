import type { RunAccount } from '../../support/run-account';
import { consoleAccount, expectFirstRow, releaseConsoleRole, signIn, visitAndRead, ZERO_ID } from '../../support/ui-finance-crm';

/**
 * CRM › WhatsApp Leads (/user-leads, /user-leads/:id), as a CRM_MANAGER seat.
 * Read-only: these are real people collected from WhatsApp communities, so
 * the spec never edits, deletes, cleans, calls or messages one. It reads the
 * list and the not-found line for an id no lead carries.
 */

const TABLE = 'crm-user-leads';

interface WaLead {
  id: string;
  phone: string;
}

describe('CRM · WhatsApp Leads (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('crm');
  });

  beforeEach(() => {
    signIn('crm', account);
  });

  after(() => {
    releaseConsoleRole(account, 'crm');
  });

  it('CWL-01 the WhatsApp lead list loads for the CRM seat and draws its first lead', () => {
    visitAndRead<{ waUserLeads: { total: number; items: WaLead[] } }>('crm', '/user-leads', 'WaUserLeads').then(
      ({ waUserLeads }) => {
        expect(waUserLeads.items.length, 'a page never holds more than the total').to.be.at.most(waUserLeads.total);
        expectFirstRow(TABLE, waUserLeads.items, (r) => r.id);
      },
    );
  });

  it('CWL-02 an id no WhatsApp lead carries reads "Lead not found."', () => {
    visitAndRead<{ waUserLead: unknown }>('crm', `/user-leads/${ZERO_ID}`, 'WaUserLead').its('waUserLead').should('equal', null);
    cy.byTestId('query-guard-not-found').should('contain.text', 'Lead not found.');
  });
});
