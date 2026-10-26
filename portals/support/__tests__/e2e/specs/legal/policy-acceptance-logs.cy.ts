import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable, tableRow } from '../../support/tables';
import { staffAccount } from '../../support/ui-staff';

/**
 * Legal › Policy Acceptance Logs (/policy-acceptance-logs): the read-only log
 * of who accepted which policy. The rows it reads are the run account's own —
 * the mWeb suite signed it up, and signup records an acceptance of every
 * signup policy. Nothing here can change a record, which the spec checks too.
 */

const TABLE = 'legal-policy-acceptance-logs';
const ACCEPTANCES = 'LegalPolicyAcceptancesTable';

const ACCEPTANCES_LOOKUP = `query E2ePolicyAcceptances($query: TableQueryInput) {
  policyAcceptancesTable(query: $query) { total rows { id user_email policy_title method } }
}`;

interface Acceptance {
  id: string;
  user_email: string;
  policy_title: string;
  method: string;
}

/** `legalAcceptanceLogs.methods` — what each stored method reads as. */
const METHOD_LABEL: Readonly<Record<string, string>> = {
  SIGNUP_FORM: 'Signup form',
  GOOGLE_SIGNUP: 'Google signup',
  ACCOUNT: 'Accepted later',
  BRAND_CONSENT: 'Brand consent (Partners)',
};

describe('Legal · Policy Acceptance Logs (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
  });

  it('PAL-01 searching by email narrows the log to that person, and a row opens its read-only Acceptance record', () => {
    cy.gql<{ policyAcceptancesTable: { total: number; rows: Acceptance[] } }>(ACCEPTANCES_LOOKUP, {
      query: { search: account.email, page: 1, page_size: 25 },
    }).then(({ policyAcceptancesTable }) => {
      const mine = policyAcceptancesTable.rows.filter((row) => row.user_email === account.email);
      expect(mine, `the run account (${account.email}) accepted the signup policies when mWeb signed it up`).to.have.length.greaterThan(0);
      const acceptance = mine[0];

      openTable('legal', '/policy-acceptance-logs', ACCEPTANCES);
      cy.byTestId('page-header-title').should('have.text', 'Policy Acceptance Logs');
      searchTable(ACCEPTANCES, account.email);
      // Every row left is this person's.
      cy.byTestIdPrefix(`${TABLE}-row-`).should('have.length', mine.length).each(($row) => {
        expect($row.text()).to.contain(account.email);
      });
      tableRow(TABLE, acceptance.id, [acceptance.policy_title, METHOD_LABEL[acceptance.method] ?? acceptance.method]);

      cy.interceptOperation('LegalPolicyAcceptanceDetail');
      cy.byTestId(`${TABLE}-row-${acceptance.id}`).click(24, 16);
      cy.wait('@LegalPolicyAcceptanceDetail');
      cy.byTestId('acceptance-dialog').should('be.visible');
      cy.byTestId('acceptance-dialog-title').should('contain.text', 'Acceptance record').and('contain.text', acceptance.policy_title);
      cy.byTestId('acceptance-dialog-body')
        .should('contain.text', 'This acceptance')
        .and('contain.text', 'The person')
        .and('contain.text', 'The policy')
        .and('contain.text', 'Wording history')
        .and('contain.text', account.email);
      // A record of something a person did: the only action is to close it.
      cy.byTestId('acceptance-dialog-actions').find('button').should('have.length', 1);
      cy.byTestId('acceptance-dialog-close').should('have.text', 'Close').click();
      cy.byTestId('acceptance-dialog').should('not.exist');
    });
  });
});
