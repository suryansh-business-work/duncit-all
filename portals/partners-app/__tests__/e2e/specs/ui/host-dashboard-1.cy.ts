import { formatMoney } from '@duncit/utils';
import { countOperation, expectNotSent, findPartnerWorld, signInPartner } from '../../support/partner-world-1';

/**
 * Partners · Host Dashboard (/host/dashboard) for the run's approved host: the
 * hero balance, six tiles, quick actions, insights and the profile-health card.
 *
 * Every figure is compared with what the server answered to the page's own
 * PartnerHostDashboard and PartnerHostInsights requests — the run host has no
 * earnings history, so the money is ₹0, but the spec reads it rather than
 * assuming it. Not here: a host WITH settled pods and monthly earnings (needs
 * completed paid pods), and a query failure (nothing is stubbed in this suite).
 */

interface Dashboard {
  me: { full_name: string | null; roles: string[] };
  myWallet: { balance: number; currency_symbol: string } | null;
  myHostEarningsSummary: {
    currency_symbol: string;
    lifetime_earnings: number;
    pending_amount: number;
    pods_completed: number;
    this_month_earnings: number;
  };
  myAccountHealth: { total_score: number; band: string } | null;
}
interface Insights {
  status_counts: { upcoming: number; ongoing: number; completed: number; cancelled: number };
  monthly_earnings: Array<{ month: string; total: number }>;
}

const count = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

/** Open the dashboard and yield both answers the page rendered from. */
function openDashboard(): Cypress.Chainable<{ dashboard: Dashboard; insights: Insights }> {
  cy.interceptOperation('PartnerHostDashboard');
  cy.interceptOperation('PartnerHostInsights');
  cy.visitApp('/host/dashboard');
  return cy.wait('@PartnerHostDashboard').then(({ response: dash }) =>
    cy.wait('@PartnerHostInsights').then(({ request, response }) => {
      expect(request.body.variables.months, 'insight months').to.equal(12);
      return {
        dashboard: dash?.body?.data as Dashboard,
        insights: response?.body?.data?.hostInsights as Insights,
      };
    }),
  );
}

describe('Partners UI · Host dashboard', () => {
  before(() => {
    signInPartner();
    // Fails loudly when the fixture step left no approved host behind.
    findPartnerWorld();
  });

  beforeEach(() => {
    signInPartner();
  });

  it('HD-01 the hero and the six tiles show the server’s figures; Total Pods adds up every status', () => {
    openDashboard().then(({ dashboard, insights }) => {
      expect(dashboard.me.roles, 'roles').to.include('HOST');
      const earnings = dashboard.myHostEarningsSummary;
      const symbol = dashboard.myWallet?.currency_symbol ?? earnings.currency_symbol;
      const money = (value: number) => formatMoney(value, { symbol: earnings.currency_symbol });
      const counts = insights.status_counts;
      // The run hosts its free pod, which is upcoming.
      expect(counts.upcoming, 'upcoming pods').to.be.at.least(1);
      cy.byTestId('host-dashboard-hero')
        .should('contain.text', 'Host Dashboard')
        .and('contain.text', formatMoney(dashboard.myWallet?.balance ?? 0, { symbol }))
        .and('contain.text', 'HOST');
      cy.byTestId('host-stat-lifetime').should('contain.text', money(earnings.lifetime_earnings));
      cy.byTestId('host-stat-this_month').should('contain.text', money(earnings.this_month_earnings));
      cy.byTestId('host-stat-pending').should('contain.text', money(earnings.pending_amount));
      const total = counts.upcoming + counts.ongoing + counts.completed + counts.cancelled;
      cy.byTestId('host-stat-total').should('contain.text', count(total));
      cy.byTestId('host-stat-upcoming').should('contain.text', count(counts.upcoming));
      cy.byTestId('host-stat-completed').should('contain.text', count(counts.completed));
    });
  });

  it('HD-02 Quick actions: Your Pods and Wallet link out, and Create pod opens the New Pod dialog on Your Pods', () => {
    const create = countOperation('CreatePartnerPod');
    openDashboard();
    cy.byTestId('host-quick-pods').should('have.attr', 'href', '/host/pods');
    cy.byTestId('host-quick-wallet').should('have.attr', 'href', '/wallet');
    cy.interceptOperation('PartnerPodLookups');
    cy.byTestId('host-quick-create').should('not.have.attr', 'aria-disabled', 'true').click();
    cy.wait('@PartnerPodLookups');
    cy.location('pathname').should('eq', '/host/pods');
    cy.byTestId('host-new-pod-dialog').should('be.visible');
    // The ?new=1 flag is dropped once the dialog is open, so a refresh does not reopen it.
    cy.location('search').should('eq', '');
    cy.get('body').type('{esc}');
    cy.byTestId('host-new-pod-dialog').should('not.exist');
    expectNotSent(create, 'CreatePartnerPod');
  });

  it('HD-03 the insight cards follow hostInsights: status bars, and a trend only from two months of data', () => {
    openDashboard().then(({ dashboard, insights }) => {
      const counts = insights.status_counts;
      const total = counts.upcoming + counts.ongoing + counts.completed + counts.cancelled;
      cy.byTestId('host-insights-status').should('contain.text', 'Pods by status');
      if (total === 0) {
        cy.byTestId('host-insights-status').should('contain.text', 'No pods yet. Once you host one it appears here.');
      } else {
        cy.byTestId('host-insights-status').find('[role="progressbar"]').should('have.length', 4);
      }
      const symbol = dashboard.myWallet?.currency_symbol ?? dashboard.myHostEarningsSummary.currency_symbol;
      const totals = insights.monthly_earnings.map((month) => month.total);
      if (insights.monthly_earnings.length >= 2) {
        cy.byTestId('host-insights-earnings').should(
          'contain.text',
          `Peak month: ${formatMoney(Math.max(...totals, 0), { symbol })}`,
        );
      } else {
        cy.byTestId('host-insights-earnings').should(
          'contain.text',
          'Not enough completed pods to draw a trend yet.',
        );
      }
    });
  });

  it('HD-04 the profile-health card shows the myAccountHealth score and the pods settled', () => {
    openDashboard().then(({ dashboard }) => {
      const health = dashboard.myAccountHealth;
      if (!health) {
        cy.byTestId('host-health-card').should('not.exist');
        return;
      }
      cy.byTestId('host-health-card')
        .should('contain.text', 'Profile health')
        .and('contain.text', String(health.total_score))
        .and('contain.text', String(dashboard.myHostEarningsSummary.pods_completed))
        .and('contain.text', 'pods settled');
    });
  });
});
