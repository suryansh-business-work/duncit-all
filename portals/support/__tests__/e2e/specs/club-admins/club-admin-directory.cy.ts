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
 * Club Admins console › Club admin directory: the brief, /club-admins and
 * /club-admins/:clubAdminId as ALL_CLUB_ADMINS_ACCESS sees them. Read-only.
 *
 * "Awaiting review" means DRAFT here (CLUB_ADMINS_SPEC in
 * packages/entity-consoles/src/shared/specs.ts): staff seed the record and
 * nobody has looked at it yet.
 */

const TABLE = 'club-admins-console-list';
const LIST = 'ClubAdminsConsoleTable';
const COUNTS = 'ClubAdminDirectoryCounts';
const ROLES = ['ALL_CLUB_ADMINS_ACCESS'] as const;
const TILES = LIFECYCLE_TILES.map((tile) => (tile.key === 'pending' ? { ...tile, search: '?status=DRAFT' } : tile));

const CLUB_ADMINS_API = `query E2eClubAdminsTable($query: TableQueryInput) {
  clubAdminProfilesTable(query: $query) { total }
}`;

interface ClubAdminRow {
  id: string;
  full_name: string;
}

function openClubAdmins(): Cypress.Chainable<ClubAdminRow[]> {
  cy.interceptOperation(LIST);
  cy.visitPortal('club-admins', '/club-admins');
  return cy.wait(`@${LIST}`).then(({ response }) => {
    const rows = (response?.body.data.clubAdminProfilesTable.rows ?? []) as ClubAdminRow[];
    expect(rows, 'staging lists at least one club admin').to.have.length.greaterThan(0);
    return rows;
  });
}

describe('Club Admins console · Club admin directory (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('club-admins', account);
  });

  after(() => {
    if (account) {
      revokeRoles(account, ['ONBOARDING_MANAGER']);
      restoreStaffRoles(account, ROLES);
    }
  });

  it('CAD-01 the brief counts club admins in one query; Awaiting review opens the DRAFT list', () => {
    cy.interceptOperation(COUNTS);
    cy.visitPortal('club-admins', '/');
    cy.byTestId('page-header-title').should('have.text', 'Club Admins');
    expectTiles(COUNTS, TILES);
    for (const tile of TILES) openTile('club-admins', tile.key, '/club-admins', tile.search);
  });

  it('CAD-02 the list opened from Declined asks the server for REJECTED club admins only', () => {
    cy.visitPortal('club-admins', '/');
    cy.interceptOperation(LIST);
    cy.byTestId('directory-tile-declined').click();
    cy.wait(`@${LIST}`).then((interception) => {
      expect(tableQuery(interception).filters).to.deep.include({ field: 'status', op: 'eq', value: 'REJECTED', values: null });
    });
  });

  it('CAD-03 the list offers no Appoint button to a console-role editor, only to a governor; a search matching nothing reads "No club admins yet."', () => {
    openClubAdmins();
    cy.byTestId('console-list-add').should('not.exist');
    searchTable(LIST, `${specMarker(account, 'club-admins')} nobody is called this`);
    expectTableEmpty('No club admins yet.');

    grantConsoleRoles(account, ['ONBOARDING_MANAGER']);
    consoleLogin('club-admins', account);
    openClubAdmins();
    cy.byTestId('console-list-add').should('have.text', 'Appoint a club admin').click();
    cy.location('pathname').should('eq', '/club-admins/new');
    revokeRoles(account, ['ONBOARDING_MANAGER']);
  });

  it('CAD-04 a row opens the record with its overview and change log; an unknown id reads "Club admin not found."', () => {
    openClubAdmins().then((rows) => {
      const admin = rows[0];
      cy.byTestId(`${TABLE}-row-${admin.id}`).click(24, 16);
      cy.location('pathname').should('eq', `/club-admins/${admin.id}`);
      cy.byTestId('back-header-title').should('have.text', admin.full_name || 'Unnamed club admin');
      cy.byTestId('club-admin-tab-overview').should('have.attr', 'aria-selected', 'true');
      cy.interceptOperation('EntityChangeLogsTable');
      pickTab('club-admin', 'changeLogs');
      cy.wait('@EntityChangeLogsTable').then(({ request, response }) => {
        expect(request.body.variables.entity_type).to.eq('CLUB_ADMIN');
        expect(request.body.variables.entity_id).to.eq(admin.id);
        expect(response?.body.errors).to.be.undefined;
      });
    });
    cy.visitPortal('club-admins', `/club-admins/${ZERO_ID}`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Club admin not found.');
  });

  it('CAD-05 without ALL_CLUB_ADMINS_ACCESS the sign-in is refused, and the list is refused to another portal’s token', () => {
    revokeRoles(account, ROLES);
    expectUiLoginRefused('club-admins', account);
    apiLoginRaw('club-admins', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    supportToken(account).then((token) => {
      rawAs('club-admins', CLUB_ADMINS_API, { query: { page: 1, page_size: 1 } }, token).then((body) =>
        expectRefused(body, 'clubAdminProfilesTable', ACCESS_DENIED),
      );
    });
    expectDeniedBanner('club-admins', 'Duncit Club Admins');
    grantConsoleRoles(account, ROLES);
  });
});
