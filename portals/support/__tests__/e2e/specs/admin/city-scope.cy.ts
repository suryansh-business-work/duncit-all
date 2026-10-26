import { E2E_GRANT_ROLES_MUTATION } from '@duncit/utils';
import { wideViewport } from '../../support/ui-staff';
import {
  adminRaw,
  cityAdminSeat,
  releaseAdminRoles,
  revokeCityAdmin,
  signInAdmin,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › City scope: a City Admin works inside their assigned city
 * (`readScope` / `userScopeFilter` in server/src/middleware/rbac.ts — the
 * users directory narrows to `profile.city`, and an admin with no city is
 * refused rather than shown every city).
 */

interface UsersPage {
  usersTable: { total: number; rows: { user_id: string; city: string | null }[] };
}

const USERS = `query E2eScopedUsers($query: TableQueryInput) { usersTable(query: $query) { total rows { user_id city } } }`;

const USERS_BOARD = `query E2eUsersBoard { entityAnalytics(entity: USERS, days: 30) { kpis { key value } } }`;

describe('Admin · City scope (City Admin, run account)', () => {
  let seat: AdminSeat;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    releaseAdminRoles(seat?.account);
  });

  it('CSC-01 All Users shows a City Admin only the members of their assigned city', () => {
    wideViewport();
    cy.interceptOperation('UsersTable');
    cy.visitPortal('admin', '/users');
    cy.wait('@UsersTable').then(({ response }) => {
      const page = (response?.body as { data?: UsersPage }).data?.usersTable;
      expect(page?.rows.length, `staging has members in ${seat.city}`).to.be.greaterThan(0);
      for (const row of page?.rows ?? []) expect(row.city, `user ${row.user_id}`).to.eq(seat.city);
    });
    cy.gql<UsersPage>(USERS, { query: { page: 1, page_size: 100 } }).then(({ usersTable }) => {
      for (const row of usersTable.rows) expect(row.city, `user ${row.user_id}`).to.eq(seat.city);
    });
  });

  // CSC-BOARD: the USERS board (Admin's Users Dashboard) applies `readScope` like the
  // directory (entityAnalytics.resolver.ts → users.data.ts userPlace). users_total counts LIVE
  // members only, while the directory also lists soft-deleted ones, so the city's directory
  // size is its upper bound — the whole platform, counted before the fix, is far past it.
  it('CSC-BOARD the Users Dashboard total for a City Admin counts only their city', () => {
    cy.gql<UsersPage>(USERS, { query: { page: 1, page_size: 1 } }).then(({ usersTable }) => {
      cy.gql<{ entityAnalytics: { kpis: { key: string; value: number }[] } }>(USERS_BOARD).then(({ entityAnalytics }) => {
        const total = entityAnalytics.kpis.find((k) => k.key === 'users_total')?.value;
        expect(total, 'users_total is counted').to.be.a('number');
        expect(total, 'users_total stays inside the City Admin’s own directory').to.be.at.most(usersTable.total);
      });
    });
  });

  it('CSC-02 a City Admin with no city assigned is refused the directory instead of shown every city', () => {
    revokeCityAdmin(seat.account);
    cy.staffGql(E2E_GRANT_ROLES_MUTATION, {
      input: { stamp: seat.account.stamp, email: seat.account.email, roles: ['CITY_ADMIN'] },
    });
    signInAdmin(seat.account);
    adminRaw<UsersPage>(USERS, { query: { page: 1, page_size: 1 } }).then((body) => {
      expect(body.errors?.[0]?.message).to.eq('Out of city scope');
      expect(body.data?.usersTable ?? null).to.be.null;
    });
  });
});
