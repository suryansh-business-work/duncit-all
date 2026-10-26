import { searchTable, tableRow } from '../../support/tables';
import { adminRun, fieldInput, openRunUser, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';
import { expectTableEmpty, specMarker, wideViewport } from '../../support/ui-staff';

/**
 * Admin › User Change Logs: the "User Change Logs" and "Admin Change Logs" tabs
 * of a member's details page (UserChangeLogsSection — one append-only row per
 * changed field, `userChangeLogsTable` split by scope on the server).
 *
 * The edit traced here is made in the Admin console by the run account on its
 * OWN record, so the server files it under the member (actor USER —
 * userAudit.service.ts `actorTypeFor`) with the surface the console declares,
 * Admin Portal. Signed in as a City Admin scoped to the run account's city.
 */

const USER_TABLE = 'admin-user-change-logs';
const ADMIN_TABLE = 'admin-user-admin-change-logs';
const LOGS = 'UserChangeLogsTable';

interface LogRow {
  id: string;
  field_label: string;
  new_value: string;
  actor_type: string;
  source: string;
}

const LOGS_LOOKUP = `query E2eAdminChangeLogs($user_id: ID!, $scope: UserChangeLogScope!, $query: TableQueryInput) {
  userChangeLogsTable(user_id: $user_id, scope: $scope, query: $query) {
    total rows { id field_label new_value actor_type source }
  }
}`;

function lookup(run: AdminRun, scope: 'USER' | 'ADMIN', search = '') {
  return cy
    .gql<{ userChangeLogsTable: { total: number; rows: LogRow[] } }>(LOGS_LOOKUP, {
      user_id: run.profile.user_id,
      scope,
      query: { search, page: 1, page_size: 25 },
    })
    .its('userChangeLogsTable');
}

function openLogsTab(run: AdminRun, tab: 'change-logs' | 'admin-change-logs'): void {
  cy.interceptOperation(LOGS);
  openRunUser(run, tab);
  cy.wait(`@${LOGS}`);
}

describe('Admin · User Change Logs (City Admin)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('CHL-01 each tab lists the server’s rows for its own scope, and asks for them newest first', () => {
    openLogsTab(run, 'change-logs');
    cy.get(`@${LOGS}`).its('request.body.variables').should('deep.include', { scope: 'USER', user_id: run.profile.user_id });
    cy.get(`@${LOGS}`).its('request.body.variables.query').should('include', { sort_by: 'created_at', sort_dir: 'desc' });
    lookup(run, 'USER').then(({ total, rows }) => {
      // mWeb signed the account up and edited its profile, so its own history is never empty.
      expect(total, 'the run account has its own change history').to.be.greaterThan(0);
      tableRow(USER_TABLE, rows[0].id, [rows[0].field_label]);
    });

    openLogsTab(run, 'admin-change-logs');
    cy.get(`@${LOGS}`).its('request.body.variables.scope').should('eq', 'ADMIN');
    lookup(run, 'ADMIN').then(({ total, rows }) => {
      if (total === 0) expectTableEmpty('No admin changes recorded yet.');
      else tableRow(ADMIN_TABLE, rows[0].id, [rows[0].field_label]);
    });
  });

  it('CHL-02 a bio saved in the Admin console appears as one Bio row attributed to the member, from Admin Portal', () => {
    const bio = specMarker(run.account, 'admin-change-log-bio');
    openRunUser(run);
    fieldInput('admin-user-profile-bio').clear().type(bio, { delay: 0 });
    cy.interceptOperation('UpdateUser');
    cy.byTestId('admin-user-profile-save').click();
    cy.wait('@UpdateUser').its('response.body.errors').should('be.undefined');

    lookup(run, 'USER', bio).then(({ rows }) => {
      const bioRows = rows.filter((row) => row.new_value === bio);
      expect(bioRows, 'exactly one Bio row carries the new value').to.have.length(1);
      const [row] = bioRows;
      expect(row.field_label).to.eq('Bio');
      expect(row.actor_type).to.eq('USER');
      expect(row.source).to.eq('ADMIN_PORTAL');

      wideViewport();
      openLogsTab(run, 'change-logs');
      searchTable(LOGS, bio);
      tableRow(USER_TABLE, row.id, ['Bio', bio, 'User', 'Admin Portal']);
    });
    lookup(run, 'ADMIN', bio).its('rows').should('have.length', 0);
  });

  it('CHL-03 a search that matches nothing shows the empty state', () => {
    openLogsTab(run, 'change-logs');
    searchTable(LOGS, specMarker(run.account, 'admin-change-log-none'));
    expectTableEmpty('No profile changes recorded yet.');
  });
});
