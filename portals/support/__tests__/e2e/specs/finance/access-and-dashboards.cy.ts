import type { RunAccount } from '../../support/run-account';
import { consoleAccount, expectApiRefused, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Finance › Access and dashboards, as the analyst seat (FINANCE_USER).
 *
 * The Finance overview at `/` draws its six KPI tiles from
 * `financeDashboardStats` (FinanceKpis.tsx: `<symbol><total.toFixed(2)>` and a
 * "±x.x% vs last month" hint). The Startup Dashboard at /startup-dashboard
 * draws `founderDashboard`; a computed metric's settings drawer says there is
 * nothing to configure, and saving a manual input is a FINANCE_MANAGER write
 * the analyst is refused.
 */

type StatKey = 'total_revenue' | 'duncit_revenue' | 'gst_collected' | 'pending_payouts' | 'completed_payouts' | 'pod_expenses';

interface FinanceStat {
  total: number;
  mom_change_pct: number;
}

type DashboardStats = { currency_symbol: string } & Record<StatKey, FinanceStat>;

const STAT_KEYS: readonly StatKey[] = [
  'total_revenue',
  'duncit_revenue',
  'gst_collected',
  'pending_payouts',
  'completed_payouts',
  'pod_expenses',
];

interface FounderMetric {
  key: string;
  source: string;
  label: string;
  formula: string;
  setting_keys: string[];
}

interface FounderDashboard {
  top: FounderMetric[];
  categories: { metrics: FounderMetric[] }[];
}

const SAVE_FOUNDER_SETTING = `mutation E2eSaveFounderSetting($input: FounderSettingInput!) {
  saveFounderSetting(input: $input) { key }
}`;

describe('Finance · Access and dashboards (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('finance');
  });

  beforeEach(() => {
    signIn('finance', account);
  });

  after(() => {
    releaseConsoleRole(account, 'finance');
  });

  it('FAD-01 the overview draws each KPI tile with the total and month-on-month change the server answered', () => {
    visitAndRead<{ financeDashboardStats: DashboardStats }>('finance', '/', 'FinanceDashboardStats').then(
      ({ financeDashboardStats: stats }) => {
        for (const key of STAT_KEYS) {
          const stat = stats[key];
          const sign = stat.mom_change_pct >= 0 ? '+' : '';
          cy.byTestId(`finance-kpi-${key}`)
            .should('contain.text', `${stats.currency_symbol}${stat.total.toFixed(2)}`)
            .and('contain.text', `${sign}${stat.mom_change_pct.toFixed(1)}% vs last month`);
        }
      },
    );
  });

  it('FAD-02 a computed startup metric explains its formula and has nothing to configure', () => {
    visitAndRead<{ founderDashboard: FounderDashboard }>('finance', '/startup-dashboard', 'FounderDashboard').then(
      ({ founderDashboard }) => {
        const metrics = [...founderDashboard.top, ...founderDashboard.categories.flatMap((c) => c.metrics)];
        const computed = metrics.find((m) => m.source === 'computed' && m.setting_keys.length === 0);
        expect(computed, 'the founder dashboard has a computed metric with no settings').to.exist;
        if (!computed) return;
        cy.byTestId(`founder-kpi-${computed.key}`).first().should('contain.text', computed.label);
        cy.byTestId(`founder-kpi-${computed.key}-settings`).first().click();
        cy.byTestId('founder-metric-drawer')
          .should('be.visible')
          .and('contain.text', computed.label)
          .and('contain.text', 'Computed from data')
          .and('contain.text', computed.formula);
        cy.byTestId('founder-metric-auto').should('have.text', 'This metric is computed automatically — nothing to configure.');
      },
    );
  });

  it('FAD-03 saving a startup dashboard input is a manager write the analyst is refused', () => {
    expectApiRefused('finance', account, SAVE_FOUNDER_SETTING, { input: { key: 'e2e_unused_key', value: 0 } }, 'saveFounderSetting');
  });
});
