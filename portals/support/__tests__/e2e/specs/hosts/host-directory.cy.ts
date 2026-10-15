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
 * Hosts console › Host directory: the brief, /hosts and /hosts/:hostId as
 * ALL_HOSTS_ACCESS sees them. Read-only — no host is changed.
 */

const TABLE = 'hosts-console-list';
const LIST = 'HostsConsoleTable';
const DETAIL = 'HostConsoleDetail';
const COUNTS = 'HostDirectoryCounts';
const ROLES = ['ALL_HOSTS_ACCESS'] as const;

const HOSTS_API = `query E2eHostsTable($query: TableQueryInput) { hostsTable(query: $query) { total } }`;

interface HostRow {
  id: string;
  user_id: string;
  full_name: string;
}

function openHosts(): Cypress.Chainable<HostRow[]> {
  cy.interceptOperation(LIST);
  cy.visitPortal('hosts', '/hosts');
  return cy.wait(`@${LIST}`).then(({ response }) => {
    const rows = (response?.body.data.hostsTable.rows ?? []) as HostRow[];
    expect(rows, 'staging lists at least one host in the Hosts console').to.have.length.greaterThan(0);
    return rows;
  });
}

describe('Hosts console · Host directory (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('hosts', account);
  });

  after(() => {
    if (account) restoreStaffRoles(account, ROLES);
  });

  it('HD-01 the brief counts hosts by status in one query, and each tile opens /hosts with its status', () => {
    cy.interceptOperation(COUNTS);
    cy.visitPortal('hosts', '/');
    cy.byTestId('page-header-title').should('have.text', 'Hosts');
    expectTiles(COUNTS, LIFECYCLE_TILES);
    for (const tile of LIFECYCLE_TILES) openTile('hosts', tile.key, '/hosts', tile.search);
  });

  it('HD-02 the list opened from Approved asks the server for APPROVED hosts only', () => {
    cy.visitPortal('hosts', '/');
    cy.interceptOperation(LIST);
    cy.byTestId('directory-tile-approved').click();
    cy.wait(`@${LIST}`).then((interception) => {
      expect(tableQuery(interception).filters).to.deep.include({ field: 'status', op: 'eq', value: 'APPROVED', values: null });
    });
  });

  it('HD-03 the list sorts on the server, and a search matching nothing reads "No hosts yet."', () => {
    openHosts();
    cy.byTestId('table-sort-full_name').click();
    cy.wait(`@${LIST}`).then((interception) => {
      expect(tableQuery(interception).sort_by).to.eq('full_name');
      expect(tableQuery(interception).sort_dir).to.eq('asc');
    });
    searchTable(LIST, `${specMarker(account, 'hosts')} no host is called this`);
    expectTableEmpty('No hosts yet.');
  });

  it('HD-04 a row opens the host; its Pods tab asks for the pods of the host’s ACCOUNT, and its change log loads', () => {
    openHosts().then((rows) => {
      const host = rows[0];
      cy.interceptOperation(DETAIL);
      cy.byTestId(`${TABLE}-row-${host.id}`).click(24, 16);
      cy.location('pathname').should('eq', `/hosts/${host.id}`);
      cy.wait(`@${DETAIL}`).its('response.body.data.host.id').should('eq', host.id);
      cy.byTestId('back-header-title').should('have.text', host.full_name || 'Unnamed host');

      cy.interceptOperation('HostConsolePodsTable');
      pickTab('host', 'pods');
      cy.wait('@HostConsolePodsTable').then((interception) => {
        expect(tableQuery(interception).filters).to.deep.include({
          field: 'host_user_id',
          op: 'eq',
          value: host.user_id,
          values: null,
        });
        expect(interception.response?.body.errors).to.be.undefined;
      });

      cy.interceptOperation('EntityChangeLogsTable');
      pickTab('host', 'changeLogs');
      cy.wait('@EntityChangeLogsTable').then(({ request, response }) => {
        expect(request.body.variables.entity_type).to.eq('HOST');
        expect(request.body.variables.entity_id).to.eq(host.id);
        expect(response?.body.errors).to.be.undefined;
      });
    });
  });

  it('HD-05 an unknown host id reads "Host not found." on the record and in the editor', () => {
    cy.visitPortal('hosts', `/hosts/${ZERO_ID}`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Host not found.');
    cy.visitPortal('hosts', `/hosts/${ZERO_ID}/edit`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Host not found.');
  });

  it('HD-06 without ALL_HOSTS_ACCESS the sign-in is refused, and hostsTable is refused to another portal’s token', () => {
    revokeRoles(account, ROLES);
    expectUiLoginRefused('hosts', account);
    apiLoginRaw('hosts', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    supportToken(account).then((token) => {
      rawAs('hosts', HOSTS_API, { query: { page: 1, page_size: 1 } }, token).then((body) =>
        expectRefused(body, 'hostsTable', ACCESS_DENIED),
      );
    });
    expectDeniedBanner('hosts', 'Duncit Hosts');
    grantConsoleRoles(account, ROLES);
  });
});
