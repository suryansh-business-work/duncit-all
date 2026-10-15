import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { consoleAccount, releaseConsoleRole, signIn } from '../../support/ui-finance-crm';
import { specMarker, wideViewport } from '../../support/ui-staff';

/**
 * CRM › AI Call Prompts (/call-prompts), as a CRM_MANAGER seat.
 *
 * The spec files its own Static Content prompt — INACTIVE, so no AI call can
 * ever pick it up — named with `runMarker(stamp, 'crm-prompts')`, then deletes
 * it from its row: the shared ConfirmDialog names it, and the row disappears.
 * `after()` removes anything a failed step left behind. No call is placed.
 */

const TABLE = 'crm-call-prompts';
const OPERATION = 'CrmCallPromptsTable';

const CREATE = `mutation E2eCreateCallPrompt($input: CreateCrmCallPromptInput!) {
  createCrmCallPrompt(input: $input) { id name is_active }
}`;

const DELETE = `mutation E2eDeleteCallPrompt($id: ID!) { deleteCrmCallPrompt(id: $id) }`;

const LOOKUP = `query E2eCallPrompts($query: TableQueryInput) {
  crmCallPromptsTable(query: $query) { rows { id name } }
}`;

describe('CRM · AI Call Prompts (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = consoleAccount('crm');
    marker = specMarker(account, 'crm-prompts');
  });

  beforeEach(() => {
    signIn('crm', account);
  });

  after(() => {
    if (marker) {
      signIn('crm', account);
      cy.gql<{ crmCallPromptsTable: { rows: { id: string; name: string }[] } }>(LOOKUP, {
        query: { search: marker, page: 1, page_size: 50 },
      }).then(({ crmCallPromptsTable }) => {
        for (const row of crmCallPromptsTable.rows.filter((r) => r.name.includes(marker))) cy.gql(DELETE, { id: row.id });
      });
    }
    releaseConsoleRole(account, 'crm');
  });

  it('CCP-01 an inactive prompt the spec filed is listed, and deleting it from its row asks first, then removes it', () => {
    const name = `${marker} static content`;
    cy.gql<{ createCrmCallPrompt: { id: string; is_active: boolean } }>(CREATE, {
      input: { name, context: 'Filed by the staff portals suite. Never used for a call.', is_active: false },
    }).then(({ createCrmCallPrompt: prompt }) => {
      expect(prompt.is_active, 'the prompt is filed switched off').to.equal(false);
      wideViewport();
      cy.interceptOperation(OPERATION);
      cy.visitPortal('crm', '/call-prompts');
      cy.wait(`@${OPERATION}`);
      searchTable(OPERATION, marker);
      cy.byTestId(`${TABLE}-row-${prompt.id}`).first().should('contain.text', name);
      cy.byTestId(`${TABLE}-row-${prompt.id}`).find('[data-testid="row-action-delete"]').click();
      cy.byTestId('confirm-dialog-message').should('have.text', `Delete "${name}"? This cannot be undone.`);
      cy.interceptOperation('DeleteCrmCallPrompt');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@DeleteCrmCallPrompt').its('response.body.data.deleteCrmCallPrompt').should('equal', true);
      cy.byTestId(`${TABLE}-row-${prompt.id}`).should('not.exist');
    });
  });
});
