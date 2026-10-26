import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { consoleAccount, releaseConsoleRole, signIn } from '../../support/ui-finance-crm';
import { slugOf, specMarker } from '../../support/ui-staff';

/**
 * CRM › Email Templates (/email-templates, /email-templates/:id), as a
 * CRM_MANAGER seat.
 *
 * The spec files its own STATIC template — switched off — named with
 * `runMarker(stamp, 'crm-templates')`, opens it in the editor from its row and
 * deletes it there through the shared ConfirmDialog. Nothing is ever sent: the
 * Send test action is not pressed. `after()` removes anything left behind.
 */

const TABLE = 'crm-email-templates';
const OPERATION = 'CrmEmailTemplatesTable';

const CREATE = `mutation E2eCreateCrmEmailTemplate($input: CreateCrmEmailTemplateInput!) {
  createCrmEmailTemplate(input: $input) { template_id name }
}`;

const DELETE = `mutation E2eDeleteCrmEmailTemplate($id: ID!) { deleteCrmEmailTemplate(template_id: $id) }`;

const LOOKUP = `query E2eCrmEmailTemplates($query: TableQueryInput) {
  crmEmailTemplatesTable(query: $query) { rows { template_id name } }
}`;

const MJML = '<mjml><mj-body><mj-section><mj-column><mj-text>Filed by the staff portals suite.</mj-text></mj-column></mj-section></mj-body></mjml>';

describe('CRM · Email Templates (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = consoleAccount('crm');
    marker = specMarker(account, 'crm-templates');
  });

  beforeEach(() => {
    signIn('crm', account);
  });

  after(() => {
    if (marker) {
      signIn('crm', account);
      cy.gql<{ crmEmailTemplatesTable: { rows: { template_id: string; name: string }[] } }>(LOOKUP, {
        query: { search: marker, page: 1, page_size: 50 },
      }).then(({ crmEmailTemplatesTable }) => {
        for (const row of crmEmailTemplatesTable.rows.filter((r) => r.name.includes(marker))) {
          cy.gql(DELETE, { id: row.template_id });
        }
      });
    }
    releaseConsoleRole(account, 'crm');
  });

  it('CET-01 a template the spec filed opens in the editor from its row, and Delete asks first, then removes it', () => {
    const name = `${marker} template`;
    cy.gql<{ createCrmEmailTemplate: { template_id: string } }>(CREATE, {
      input: { slug: slugOf(name), name, subject: `${marker} subject`, target: 'STATIC', mjml: MJML, is_active: false },
    }).then(({ createCrmEmailTemplate: { template_id: id } }) => {
      cy.interceptOperation(OPERATION);
      cy.visitPortal('crm', '/email-templates');
      cy.wait(`@${OPERATION}`);
      searchTable(OPERATION, marker);
      cy.byTestId(`${TABLE}-row-${id}`).first().should('contain.text', name).click(24, 16);
      cy.location('pathname').should('eq', `/email-templates/${id}`);
      cy.byTestId('crm-template-save').should('be.disabled');
      cy.byTestId('crm-template-delete').click();
      cy.byTestId('confirm-dialog-message').should('have.text', `Delete "${name}"? This cannot be undone.`);
      cy.interceptOperation('DeleteCrmEmailTemplate');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@DeleteCrmEmailTemplate').its('response.body.data.deleteEmailTemplate').should('equal', true);
      cy.location('pathname').should('eq', '/email-templates');
    });
  });
});
