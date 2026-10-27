import {
  TABLE_VIEWPORT,
  partnerWorld2,
  pickOption,
  signInRunPartner,
  tableRow,
  type PartnerWorld2,
} from '../../support/ui-partners-2';

/**
 * Partners › Club admin dashboard (/club-admin/dashboard), as the admin of the
 * run's one club — created by the fixture step with no category
 * (fixture-world.ts ensureClub), so "Your Categories" is empty by design.
 *
 * The range select drives BOTH clubAdminDashboard and clubAdminDashboardTable
 * through `from` (@duncit/utils clubAdminRangeFrom: null for All time); the
 * default is Last 12 months (DEFAULT_CLUB_ADMIN_RANGE). Copy is the shipped
 * clubAdmin.dashboard bundle.
 */

const TABLE = 'partners-app-club-admin-clubs';

function openDashboard(): void {
  cy.viewport(...TABLE_VIEWPORT);
  cy.interceptOperation('ClubAdminDashboard');
  cy.interceptOperation('ClubAdminDashboardTable');
  cy.visitApp('/club-admin/dashboard');
}

describe('Partners UI · Club admin dashboard (the run’s own club)', () => {
  let world: PartnerWorld2;

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
      expect(found.clubCategoryId, 'the fixture club has no category').to.equal(null);
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('CAD-01 opens on Last 12 months with no category tile and the run’s club in the per-club breakdown', () => {
    openDashboard();
    cy.wait('@ClubAdminDashboard').then(({ request, response }) => {
      expect(request.body.variables.from, 'a 12-month window has a start').to.be.a('string');
      expect(response?.body.data.clubAdminDashboard.categories, 'categories of the run’s clubs').to.deep.equal([]);
    });
    cy.wait('@ClubAdminDashboardTable');
    cy.byTestId('club-admin-range').should('contain.text', 'Last 12 months');
    cy.byTestId('club-admin-categories')
      .should('contain.text', 'Your Categories')
      .and('contain.text', 'No category is set on your clubs yet.');
    tableRow(TABLE, world.clubId, [world.clubName]);
  });

  it('CAD-02 All time asks both the figures and the table for an unbounded window', () => {
    openDashboard();
    cy.wait('@ClubAdminDashboard');
    cy.wait('@ClubAdminDashboardTable');
    pickOption('club-admin-range', 'club-admin-range-all');
    cy.wait('@ClubAdminDashboard').its('request.body.variables.from').should('eq', null);
    cy.wait('@ClubAdminDashboardTable').its('request.body.variables.from').should('eq', null);
    cy.byTestId('club-admin-range').should('contain.text', 'All time');
    tableRow(TABLE, world.clubId, [world.clubName]);
  });

  it('CAD-03 a club in the breakdown opens that club’s pods page', () => {
    openDashboard();
    cy.wait('@ClubAdminDashboardTable');
    cy.byTestId(`club-admin-dashboard-club-${world.clubId}`).should('have.text', world.clubName).click();
    cy.location('pathname').should('eq', `/club-admin/clubs/${world.clubId}`);
    cy.byTestId('club-pods-heading').should('have.text', world.clubName);
  });
});
