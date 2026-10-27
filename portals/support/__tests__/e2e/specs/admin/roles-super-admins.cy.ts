import { openTable, searchTable, tableRow } from '../../support/tables';
import { adminRun, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';
import { ACCESS_DENIED, expectRefused, expectTableEmpty, gqlRaw, specMarker, wideViewport } from '../../support/ui-staff';

/**
 * Admin › Roles & Super Admins (/rbac/roles): the Super Admins card and the
 * `admin-roles` table over `rolesTable`. Reading is open to SUPER_ADMIN,
 * CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER; every write — a role or a super
 * admin — is SUPER_ADMIN's alone (rbac.resolver.ts), which the run account can
 * never hold. So the spec browses as a City Admin and proves the server turns
 * its writes away, aimed at an id that does not exist.
 */

const TABLE = 'admin-roles';
const ROLES = 'RolesTable';
const ZERO_ID = '000000000000000000000000';

const LOOKUP = `query E2eAdminRolesLookup($query: TableQueryInput) {
  rolesTable(query: $query) { total rows { id key name is_system } }
}`;

const UPDATE_ROLE = `mutation E2eAdminUpdateRole($role_id: ID!, $input: UpdateRoleInput!) {
  updateRole(role_id: $role_id, input: $input) { id }
}`;

const DELETE_ROLE = `mutation E2eAdminDeleteRole($role_id: ID!) { deleteRole(role_id: $role_id) }`;

interface RoleRow {
  id: string;
  key: string;
  name: string;
  is_system: boolean;
}

describe('Admin · Roles & Super Admins (City Admin)', () => {
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

  it('RLS-01 the page lists roles A→Z by key; searching a key narrows to it, typed System; a miss shows the empty state', () => {
    wideViewport();
    openTable('admin', '/rbac/roles', ROLES);
    cy.get(`@${ROLES}`).its('request.body.variables.query').should('include', { sort_by: 'key', sort_dir: 'asc' });
    cy.gql<{ rolesTable: { rows: RoleRow[] } }>(LOOKUP, { query: { search: 'CITY_ADMIN', page: 1, page_size: 10 } }).then(
      ({ rolesTable }) => {
        const role = rolesTable.rows.find((r) => r.key === 'CITY_ADMIN');
        expect(role, 'the CITY_ADMIN role exists').to.exist;
        expect(role?.is_system, 'CITY_ADMIN is a system role').to.eq(true);
        searchTable(ROLES, 'CITY_ADMIN');
        cy.byTestIdPrefix(`${TABLE}-row-`).should('have.length', rolesTable.rows.length);
        tableRow(TABLE, String(role?.id), ['CITY_ADMIN', String(role?.name), 'System']);
      },
    );

    openTable('admin', '/rbac/roles', ROLES);
    searchTable(ROLES, specMarker(run.account, 'admin-roles-none'));
    expectTableEmpty('No roles yet. Click "New Role" to create the first one.');
  });

  it('RLS-02 a City Admin is refused every role write by the server', () => {
    signInAdmin(run).then((token) => {
      gqlRaw('admin', UPDATE_ROLE, { role_id: ZERO_ID, input: { name: 'x' } }, token).then((body) =>
        expectRefused(body, 'updateRole', ACCESS_DENIED),
      );
      gqlRaw('admin', DELETE_ROLE, { role_id: ZERO_ID }, token).then((body) =>
        expectRefused(body, 'deleteRole', ACCESS_DENIED),
      );
    });
  });
});
