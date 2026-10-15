import { wideViewport } from '../../support/ui-staff';
import { cityAdminSeat, releaseAdminRoles, signInAdmin, type AdminSeat } from '../../support/ui-admin-2';

/**
 * Admin › User Management › Users Dashboard (/users-dashboard) — the Analytics
 * console's Users page mounted in Admin (entityAnalytics.resolver.ts lets
 * CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER read the USERS board) — and the
 * contact-data flags it reports, as red rows with their reasons on All Users.
 * Read-only, as a City Admin. Whether the board's totals stay inside the City
 * Admin's city is city-scope.cy.ts's concern.
 */

interface UserRowLite {
  user_id: string;
  data_issues: string[] | null;
}

interface Body<T> {
  data?: T;
  errors?: { message: string }[];
}

describe('Admin · Users Dashboard (City Admin, run account)', () => {
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

  it('UDB-01 the dashboard renders the USERS board for a City Admin', () => {
    cy.interceptOperation('EntityAnalytics');
    cy.visitPortal('admin', '/users-dashboard');
    cy.wait('@EntityAnalytics').then(({ request, response }) => {
      expect(request.body.variables.entity).to.eq('USERS');
      const body = response?.body as Body<{ entityAnalytics: { kpis: { key: string }[] } }>;
      expect(body.errors, 'the board answers a City Admin').to.be.undefined;
      expect(body.data?.entityAnalytics.kpis.map((k) => k.key)).to.include('users_total');
    });
    cy.byTestId('analytics-page-users-dashboard').should('be.visible').and('contain.text', 'Users Dashboard');
  });

  it('UDB-02 on All Users every account with contact-data issues carries one chip per issue; the rest read "None"', () => {
    wideViewport();
    cy.interceptOperation('UsersTable');
    cy.visitPortal('admin', '/users');
    cy.wait('@UsersTable').then(({ response }) => {
      const body = response?.body as Body<{ usersTable: { rows: UserRowLite[] } }>;
      expect(body.errors, 'All Users answers a City Admin').to.be.undefined;
      const rows = body.data?.usersTable.rows ?? [];
      expect(rows.length, `staging has members in ${seat.city}`).to.be.greaterThan(0);
      for (const row of rows) {
        const issues = row.data_issues ?? [];
        cy.byTestId(`admin-users-row-${row.user_id}`).within(() => {
          if (issues.length === 0) {
            cy.get('[data-testid^="user-issue-"]').should('not.exist');
            cy.root().should('contain.text', 'None');
          } else {
            for (const issue of issues) cy.byTestId(`user-issue-${issue}`).should('exist');
          }
        });
      }
    });
  });
});
