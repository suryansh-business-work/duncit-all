import type { RunAccount } from '../../support/run-account';
import { staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Pods dashboard (/pods/dashboard): live counts and a reporting
 * period for money, ratings and the trend. Every number is checked against the
 * answer the page itself received, so the spec holds whatever staging contains;
 * the one scenario that needs a pod in a list says so when there is none.
 */

interface DashboardPod {
  id: string;
}

interface Dashboard {
  podDashboard: {
    days: number;
    totals: { total: number; upcoming: number; cancelled: number };
    top_rated: DashboardPod[];
    needs_attention: DashboardPod[];
    upcoming: DashboardPod[];
  };
}

describe('Pods Portal · Pods dashboard (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  it('PDB-01 the tiles show the live counts, a new period re-asks the server, and All pods opens the list', () => {
    cy.interceptOperation('AdminPodDashboard');
    cy.visitPortal('pods', '/pods/dashboard');
    cy.byTestId('page-header-title').should('have.text', 'Pods dashboard');
    cy.wait('@AdminPodDashboard').then(({ request, response }) => {
      expect(request.body.variables.days, 'the default period').to.equal(30);
      const { totals } = (response?.body.data as Dashboard).podDashboard;
      cy.byTestId('pods-dashboard-tile-total').should('contain.text', 'All pods').and('contain.text', String(totals.total));
      cy.byTestId('pods-dashboard-tile-upcoming').should('contain.text', String(totals.upcoming));
      cy.byTestId('pods-dashboard-tile-cancelled').should('contain.text', String(totals.cancelled));
    });
    cy.byTestId('pods-dashboard-period-30').should('have.attr', 'aria-pressed', 'true');

    cy.byTestId('pods-dashboard-period-90').click();
    cy.wait('@AdminPodDashboard').its('request.body.variables.days').should('eq', 90);
    cy.byTestId('pods-dashboard-period-90').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('pods-dashboard-error').should('not.exist');

    cy.byTestId('pods-dashboard-tile-total').click();
    cy.location('pathname').should('eq', '/pods');
  });

  it('PDB-02 a pod in Best rated, Needs attention or Starting next opens its record', () => {
    cy.interceptOperation('AdminPodDashboard');
    cy.visitPortal('pods', '/pods/dashboard');
    cy.wait('@AdminPodDashboard').then(({ response }) => {
      const board = (response?.body.data as Dashboard).podDashboard;
      const listed = [...board.top_rated, ...board.needs_attention, ...board.upcoming];
      expect(listed, 'staging has a rated or upcoming pod for the dashboard to list').to.have.length.greaterThan(0);
      const pod = listed[0];
      cy.byTestId(`pods-dashboard-pod-${pod.id}`).first().click();
      cy.location('pathname').should('eq', `/pods/${pod.id}`);
      cy.byTestId('pod-details-title').should('be.visible');
    });
  });
});
