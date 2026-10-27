import type { RunAccount } from '../../support/run-account';
import { CREATE_POLICY_API, deleteMarkedPolicies, slugOf, specMarker, staffAccount } from '../../support/ui-staff';

/**
 * Legal › Access and dashboard: the Legal Dashboard at `/` — two way-in tiles
 * and the documents / policies by-type tables.
 *
 * The by-type count is proven with a policy this spec files itself under a type
 * nobody else uses (`<marker> type`). It is filed HIDDEN: an active policy gates
 * every new signup, and this one must never reach a member. `after()` deletes it.
 */

interface DocumentStats {
  legalDocumentStats: { total: number };
}

/** The Policies by type table's own search box — the page holds two tables. */
const policyTypeSearch = () => cy.get('[data-testid="table-toolbar-search"][aria-label="Search policy type"]');

describe('Legal · Access and dashboard (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'legal-dashboard');
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
  });

  after(() => {
    if (!marker) return;
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
    deleteMarkedPolicies(marker);
  });

  it('LAD-01 the dashboard counts every document, and its two tiles open Documents and Policies', () => {
    cy.interceptOperation('LegalDocumentStats');
    cy.visitPortal('legal', '/');
    cy.byTestId('page-header-title').should('have.text', 'Legal Dashboard');
    cy.wait('@LegalDocumentStats')
      .its('response.body.data')
      .then((data: DocumentStats) => {
        cy.byTestId('legal-dashboard-documents')
          .should('contain.text', String(data.legalDocumentStats.total))
          .and('contain.text', 'Total documents');
      });
    cy.byTestId('legal-dashboard-documents').click();
    cy.location('pathname').should('eq', '/documents');
    cy.byTestId('page-header-title').should('have.text', 'Documents');

    cy.visitPortal('legal', '/');
    cy.byTestId('legal-dashboard-policies')
      .should('contain.text', 'View, manage, and publish platform policies.')
      .click();
    cy.location('pathname').should('eq', '/policies');
    cy.byTestId('page-header-title').should('have.text', 'Policies');
  });

  it('LAD-02 a policy filed under a new type shows in Policies by type with a count of 1', () => {
    const policyType = `${marker} type`;
    const title = `${marker} dashboard policy`;
    cy.gql(CREATE_POLICY_API, {
      input: {
        title,
        slug: slugOf(title),
        policy_type: policyType,
        content: '<p>Filed by the staff portals suite.</p>',
        is_active: false,
        requires_signup_acceptance: false,
      },
    });
    cy.interceptOperation('LegalPolicyStatsTable');
    cy.visitPortal('legal', '/');
    cy.wait('@LegalPolicyStatsTable');
    policyTypeSearch().should('be.enabled').type(policyType, { delay: 0 });
    cy.wait('@LegalPolicyStatsTable');
    // The row is its two cells: the type, then the count — and only this
    // spec's one policy carries the type.
    cy.byTestId(`legal-policies-by-type-row-${policyType}`).should(($row) => {
      const text = $row.text().trim();
      expect(text.startsWith(policyType), 'the Policy type cell').to.be.true;
      expect(text.slice(policyType.length).trim(), 'the Total policies cell').to.equal('1');
    });
  });
});
