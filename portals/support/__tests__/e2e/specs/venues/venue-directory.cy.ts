import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import {
  ACCESS_DENIED,
  PORTAL_REFUSED,
  apiLoginRaw,
  expectDeniedBanner,
  expectRefused,
  expectTableEmpty,
  expectUiLoginRefused,
  restoreStaffRoles,
  revokeRoles,
  specMarker,
  staffAccount,
} from '../../support/ui-staff';
import {
  LIFECYCLE_TILES,
  ZERO_ID,
  consoleLogin,
  expectTiles,
  grantConsoleRoles,
  openTile,
  pickTab,
  rawAs,
  supportToken,
  tableQuery,
} from '../../support/ui-directories';

/**
 * Venues console › Venue directory: the brief at `/`, the list at /venues and
 * the record at /venues/:venueId, as ALL_VENUES_ACCESS (a console editor) sees
 * them. Read-only — no venue is changed.
 */

const TABLE = 'admin-venues';
const LIST = 'AdminVenuesTable';
const DETAIL = 'AdminVenueDetail';
const COUNTS = 'VenueDirectoryCounts';
const ROLES = ['ALL_VENUES_ACCESS'] as const;

const VENUES_API = `query E2eVenuesTable($query: TableQueryInput) {
  venuesTable(query: $query) { total rows { id venue_name } }
}`;

interface VenueRow {
  id: string;
  venue_name: string;
}

/** The list, and the first page of rows as the page received it. */
function openVenues(): Cypress.Chainable<{ rows: VenueRow[]; total: number }> {
  cy.interceptOperation(LIST);
  cy.visitPortal('venues', '/venues');
  return cy.wait(`@${LIST}`).then(({ response }) => {
    const page = response?.body.data.venuesTable as { rows: VenueRow[]; total: number };
    expect(page.rows, 'staging lists at least one venue in the Venues console').to.have.length.greaterThan(0);
    return page;
  });
}

describe('Venues console · Venue directory (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('venues', account);
  });

  after(() => {
    if (account) restoreStaffRoles(account, ROLES);
  });

  it('VD-01 the brief counts venues by review status in one query, and each tile opens the list with its status', () => {
    cy.interceptOperation(COUNTS);
    cy.visitPortal('venues', '/');
    cy.byTestId('page-header-title').should('have.text', 'Venues');
    expectTiles(COUNTS, LIFECYCLE_TILES);
    for (const tile of LIFECYCLE_TILES) openTile('venues', tile.key, '/venues', tile.search);
  });

  it('VD-02 the list opened from Declined asks the server for REJECTED venues only', () => {
    cy.visitPortal('venues', '/');
    cy.interceptOperation(LIST);
    cy.byTestId('directory-tile-declined').click();
    cy.wait(`@${LIST}`).then((interception) => {
      expect(tableQuery(interception).filters).to.deep.include({ field: 'status', op: 'eq', value: 'REJECTED', values: null });
    });
  });

  it('VD-03 search, sort, paging and the super category filter are each one server query; a search matching nothing shows the empty text', () => {
    openVenues().then(({ total }) => {
      cy.byTestId('table-sort-venue_name').click();
      cy.wait(`@${LIST}`).then((interception) => {
        const query = tableQuery(interception);
        expect(query.sort_by).to.eq('venue_name');
        expect(query.sort_dir).to.eq('asc');
      });

      if (total > 25) {
        cy.byTestId('table-page-next').click();
        cy.wait(`@${LIST}`).then((interception) => expect(tableQuery(interception).page).to.eq(2));
        cy.byTestId('table-page-previous').click();
        cy.wait(`@${LIST}`).then((interception) => expect(tableQuery(interception).page).to.eq(1));
      } else {
        cy.byTestId('table-page-next').should('be.disabled');
      }

      cy.byTestId('super-category-filter').find('[role="combobox"]').click();
      cy.byTestIdPrefix('super-category-option-')
        .not('[data-testid="super-category-option-all"]')
        .first()
        .invoke('attr', 'data-testid')
        .then((testId) => {
          const superId = String(testId).replace('super-category-option-', '');
          cy.byTestId(String(testId)).click();
          cy.wait(`@${LIST}`).then((interception) => {
            expect(tableQuery(interception).filters).to.deep.include({
              field: 'super_category_id',
              op: 'eq',
              value: superId,
              values: null,
            });
            expect(interception.response?.body.errors, 'the filter is on the allowlist').to.be.undefined;
          });
        });
    });

    searchTable(LIST, `${specMarker(account, 'venues')} no venue is called this`);
    expectTableEmpty('No venues found.');
  });

  it('VD-04 the row is the way in: it opens /venues/<id> on that venue', () => {
    openVenues().then(({ rows }) => {
      const venue = rows[0];
      cy.interceptOperation(DETAIL);
      cy.byTestId(`${TABLE}-row-${venue.id}`).click(24, 16);
      cy.location('pathname').should('eq', `/venues/${venue.id}`);
      cy.wait(`@${DETAIL}`).its('response.body.data.venue.id').should('eq', venue.id);
      cy.byTestId('back-header-title').should('have.text', venue.venue_name);
      cy.byTestId('back-header-back').click();
      cy.location('pathname').should('eq', '/venues');
    });
  });

  it('VD-05 the open tab lives in ?selectedtab=, so a reload keeps Documents open', () => {
    openVenues().then(({ rows }) => {
      cy.visitPortal('venues', `/venues/${rows[0].id}`);
      cy.byTestId('venue-tab-overview').should('have.attr', 'aria-selected', 'true');
      pickTab('venue', 'operations');
      pickTab('venue', 'documents');
      cy.reload();
      cy.location('search').should('contain', 'selectedtab=documents');
      cy.byTestId('venue-tab-documents').should('have.attr', 'aria-selected', 'true');
    });
  });

  it('VD-06 an unknown venue id reads "Venue not found." and draws no tabs', () => {
    cy.visitPortal('venues', `/venues/${ZERO_ID}`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Venue not found.');
    cy.byTestId('venue-tab-overview').should('not.exist');
  });

  it('VD-07 the Change Logs tab reads this venue’s own trail, or says nothing was recorded', () => {
    openVenues().then(({ rows }) => {
      const venue = rows[0];
      cy.visitPortal('venues', `/venues/${venue.id}`);
      cy.interceptOperation('EntityChangeLogsTable');
      pickTab('venue', 'changeLogs');
      cy.wait('@EntityChangeLogsTable').then(({ request, response }) => {
        expect(request.body.variables.entity_type).to.eq('VENUE');
        expect(request.body.variables.entity_id).to.eq(venue.id);
        expect(response?.body.errors).to.be.undefined;
        const total = response?.body.data.entityChangeLogsTable.total as number;
        if (total === 0) expectTableEmpty('No changes recorded yet.');
        else cy.byTestIdPrefix('venues-console-change-logs-row-').should('have.length.greaterThan', 0);
      });
    });
  });

  it('VD-08 without ALL_VENUES_ACCESS the sign-in is refused, and venuesTable is refused to another portal’s token', () => {
    revokeRoles(account, ROLES);
    expectUiLoginRefused('venues', account);
    apiLoginRaw('venues', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    supportToken(account).then((token) => {
      rawAs('venues', VENUES_API, { query: { page: 1, page_size: 1 } }, token).then((body) =>
        expectRefused(body, 'venuesTable', ACCESS_DENIED),
      );
    });
    expectDeniedBanner('venues', 'Duncit Venues');
    grantConsoleRoles(account, ROLES);
  });
});
