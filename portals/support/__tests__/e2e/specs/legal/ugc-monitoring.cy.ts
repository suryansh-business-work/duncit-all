import type { RunAccount } from '../../support/run-account';
import { searchTable, tableRow } from '../../support/tables';
import {
  countOperation,
  expectConfirm,
  expectNotSent,
  expectNotify,
  specMarker,
  staffAccount,
  wideViewport,
} from '../../support/ui-staff';

/**
 * Legal › UGC Monitoring › Settings: the report categories the app and mWeb
 * offer in their Report dialog. The spec adds one category of its own, named
 * with its marker and saved with "Show in the report dialog" OFF — so no member
 * is ever offered it — then deletes it (nobody filed a report under it, which
 * is what lets Delete through). `after()` removes it if a step failed between.
 */

const TABLE = 'legal-ugc-report-categories';
const CATEGORIES = 'ReportCategoriesTable';

const CATEGORIES_LOOKUP = `query E2eReportCategories($query: TableQueryInput) {
  reportCategoriesTable(query: $query) { rows { id label } }
}`;

const DELETE_CATEGORY_API = `mutation E2eDeleteReportCategory($id: ID!) { deleteReportCategory(id: $id) }`;

describe('Legal · UGC Monitoring (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'legal-ugc');
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
    wideViewport();
  });

  after(() => {
    if (!marker) return;
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
    cy.gql<{ reportCategoriesTable: { rows: { id: string; label: string }[] } }>(CATEGORIES_LOOKUP, {
      query: { search: marker, page: 1, page_size: 25 },
    }).then((data) => {
      for (const row of data.reportCategoriesTable.rows.filter((r) => r.label.includes(marker))) {
        cy.gql(DELETE_CATEGORY_API, { id: row.id });
      }
    });
  });

  it('UGC-01 Settings › Add category needs a name, saves a hidden category, and Delete removes it', () => {
    const label = `${marker} Copyright issue`;
    cy.interceptOperation(CATEGORIES);
    cy.visitPortal('legal', '/ugc-monitoring');
    cy.byTestId('ugc-monitoring-page').should('be.visible');
    cy.byTestId('ugc-tab-settings').click();
    cy.wait(`@${CATEGORIES}`);
    cy.location('search').should('contain', 'selectedtab=settings');
    cy.byTestId('ugc-settings-tab').should('contain.text', 'Report categories');

    cy.byTestId('report-category-add').click();
    cy.byTestId('report-category-dialog').should('be.visible');
    const creates = countOperation('CreateReportCategory');
    cy.byTestId('report-category-save').click();
    cy.byTestId('report-category-form').should('contain.text', 'Give the category a name');
    expectNotSent(creates, 'CreateReportCategory');

    cy.byTestId('report-category-label').type(label, { delay: 0 });
    cy.byTestId('report-category-requires_details').check();
    // Off before the first save: a category that is shown reaches every member's Report dialog.
    cy.byTestId('report-category-is_active').uncheck().should('not.be.checked');
    cy.interceptOperation('CreateReportCategory');
    cy.byTestId('report-category-save').click();
    cy.wait('@CreateReportCategory').then(({ request, response }) => {
      expect(request.body.variables.input.is_active, 'saved hidden').to.be.false;
      expect(request.body.variables.input.requires_details, 'asks the reporter to describe it').to.be.true;
      const id = response?.body.data.createReportCategory.id as string;
      expectNotify('success', 'Category saved');
      cy.byTestId('report-category-dialog').should('not.exist');
      searchTable(CATEGORIES, label);
      tableRow(TABLE, id, [label]);

      cy.byTestId(`${TABLE}-row-${id}`).within(() => cy.byTestId('row-action-delete').click());
      expectConfirm('Delete this category?');
      cy.interceptOperation('DeleteReportCategory');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@DeleteReportCategory').its('response.body.errors').should('be.undefined');
      expectNotify('success', 'Category deleted');
      cy.byTestId(`${TABLE}-row-${id}`).should('not.exist');
    });
  });
});
