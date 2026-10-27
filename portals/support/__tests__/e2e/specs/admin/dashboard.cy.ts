import { adminRun, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';
import { pickOption } from '../../support/ui-staff';

/**
 * Admin › Dashboard (/dashboard): the summary tiles and the two "by super
 * category" widgets, all fed by one `dashboardTotals` query
 * (portals/admin/src/pages/DashboardPage.tsx). The server counts a City Admin's
 * own city (analytics.resolver.ts — `readScope`), so every number on screen is
 * checked against the same query asked with the same session.
 */

interface Totals {
  users_total: number;
  pods_total: number;
  clubs_total: number;
  venues_total: number;
  hosts_total: number;
  support_tickets_open: number;
}

const TOTALS = `query E2eAdminDashboardTotals($slug: String) {
  dashboardTotals(super_category_slug: $slug) {
    users_total pods_total clubs_total venues_total hosts_total support_tickets_open
  }
}`;

const SUPER_CATS = `query E2eAdminSuperCats { categories(filter: { level: SUPER }) { slug name } }`;

/** dashboard/queries.ts SUMMARY_TILES: key → label, and where the tile links (if anywhere). */
const TILES: ReadonlyArray<{ key: keyof Totals; label: string; to?: string }> = [
  { key: 'users_total', label: 'Users', to: '/users' },
  { key: 'pods_total', label: 'Pods', to: '/pods' },
  { key: 'clubs_total', label: 'Clubs', to: '/clubs' },
  { key: 'venues_total', label: 'Venues' },
  { key: 'hosts_total', label: 'Hosts' },
  { key: 'support_tickets_open', label: 'Support Tickets' },
];

function expectTotals(totals: Totals): void {
  for (const tile of TILES) {
    cy.byTestId(`admin-dashboard-tile-${tile.key}`)
      .should('contain.text', tile.label)
      .and('contain.text', String(totals[tile.key]));
  }
  cy.byTestId('admin-dashboard-pods-total').should('have.text', `Total ${totals.pods_total}`);
  cy.byTestId('admin-dashboard-clubs-total').should('have.text', `Total ${totals.clubs_total}`);
}

describe('Admin · Dashboard (City Admin)', () => {
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

  it('DSH-01 the summary tiles and widget totals show exactly what dashboardTotals answers for this admin', () => {
    cy.interceptOperation('DashboardTotals');
    cy.visitPortal('admin', '/dashboard');
    cy.wait('@DashboardTotals').its('request.body.variables.slug').should('equal', null);
    cy.gql<{ dashboardTotals: Totals }>(TOTALS, { slug: null }).then(({ dashboardTotals }) => expectTotals(dashboardTotals));
  });

  it('DSH-02 the super category select re-asks every widget for that category, and "all" returns the platform totals', () => {
    cy.gql<{ categories: { slug: string; name: string }[] }>(SUPER_CATS).then(({ categories }) => {
      expect(categories, 'staging has at least one super category to filter by').to.have.length.greaterThan(0);
      const { slug } = categories[0];
      cy.interceptOperation('DashboardTotals');
      cy.visitPortal('admin', '/dashboard');
      cy.wait('@DashboardTotals');

      pickOption('admin-dashboard-super-category', `admin-dashboard-super-${slug}`);
      cy.wait('@DashboardTotals').its('request.body.variables.slug').should('equal', slug);
      cy.gql<{ dashboardTotals: Totals }>(TOTALS, { slug }).then(({ dashboardTotals }) => expectTotals(dashboardTotals));

      pickOption('admin-dashboard-super-category', 'admin-dashboard-super-all');
      cy.wait('@DashboardTotals').its('request.body.variables.slug').should('equal', null);
      cy.gql<{ dashboardTotals: Totals }>(TOTALS, { slug: null }).then(({ dashboardTotals }) => expectTotals(dashboardTotals));
    });
  });

  it('DSH-03 only Users, Pods and Clubs tiles link anywhere; Pods and Clubs moved out, so they fall back to the Hub', () => {
    cy.visitPortal('admin', '/dashboard');
    for (const tile of TILES) {
      const link = cy.byTestId(`admin-dashboard-tile-${tile.key}`).find('a');
      if (tile.to) link.should('have.attr', 'href', tile.to);
      else link.should('not.exist');
    }
    cy.byTestId('admin-dashboard-tile-users_total').find('a').click();
    cy.location('pathname').should('eq', '/users');
    cy.visitPortal('admin', '/dashboard');
    cy.byTestId('admin-dashboard-tile-pods_total').find('a').click();
    cy.location('pathname').should('eq', '/hub');
  });
});
