import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  consoleAccount,
  expectApiRefused,
  expectFirstRow,
  releaseConsoleRole,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Duncit Coin (/duncit-coin/dashboard, /duncit-coin/transactions,
 * /duncit-coin/settings), as the analyst seat (FINANCE_USER).
 *
 * The analyst reads the circulation stats, the ledger and the payout rules
 * (COIN_ADMIN_READ / COIN_LOG_READ in coin.resolver.ts). Changing the rules,
 * granting or deducting coins and even searching for a member to adjust are
 * COIN_ADMIN_WRITE (SUPER_ADMIN, FINANCE_MANAGER) — refused, probed with an
 * empty input and an id no member carries.
 *
 * The dashboard warns exactly when the ledger's outstanding coins and the sum
 * of member balances disagree (`drift` in CoinDashboardPage.tsx).
 */

const TABLE = 'admin-coin-transactions';

interface CoinStats {
  total_outstanding: number;
  wallet_balance_total: number;
}

interface CoinTxn {
  id: string;
  pods: { id: string }[] | null;
}

interface CoinPage {
  coinTransactionsTable: { total: number; rows: CoinTxn[] };
}

const UPDATE_COIN_SETTINGS = `mutation E2eUpdateCoinSettings($input: CoinSettingsInput!) {
  updateCoinSettings(input: $input) { updated_at }
}`;

const ADJUST_USER_COINS = `mutation E2eAdjustUserCoins($user_id: ID!, $direction: CoinAdjustDirection!, $coins: Int!, $reason: String!) {
  adjustUserCoins(user_id: $user_id, direction: $direction, coins: $coins, reason: $reason) { balance }
}`;

const COIN_USER_SEARCH = `query E2eCoinUserSearch($term: String!) {
  coinUserSearch(term: $term) { id }
}`;

describe('Finance · Duncit Coin (run account, password CHANGED)', () => {
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

  it('FDC-01 the dashboard warns about a ledger/balance gap exactly when there is one', () => {
    visitAndRead<{ coinAdminStats: CoinStats }>('finance', '/duncit-coin/dashboard', 'AdminCoinStats').then(
      ({ coinAdminStats: stats }) => {
        if (stats.total_outstanding === stats.wallet_balance_total) {
          cy.byTestId('coin-drift-warning').should('not.exist');
        } else {
          cy.byTestId('coin-drift-warning').should('be.visible').and('contain.text', 'The ledger is the source of truth');
        }
      },
    );
  });

  it('FDC-02 ?pod_id narrows the ledger to that pod\'s coins, and without it every row returns', () => {
    visitAndRead<CoinPage>('finance', '/duncit-coin/transactions', 'AdminCoinTransactionsTable').then(
      ({ coinTransactionsTable: all }) => {
        expectFirstRow(TABLE, all.rows, (r) => r.id);
        const podId = all.rows.flatMap((r) => r.pods ?? [])[0]?.id;
        expect(podId, 'the first page of the ledger holds a pod-linked transaction').to.be.a('string');
        if (!podId) return;
        visitAndRead<CoinPage>('finance', `/duncit-coin/transactions?pod_id=${podId}`, 'AdminCoinTransactionsTable').then(
          ({ coinTransactionsTable: scoped }) => {
            expect(scoped.total, 'the pod has coin movements').to.be.greaterThan(0);
            expect(scoped.total, 'a pod is a part of the whole ledger').to.be.at.most(all.total);
            for (const row of scoped.rows) {
              expect((row.pods ?? []).map((p) => p.id), `transaction ${row.id} belongs to the pod`).to.include(podId);
            }
            expectFirstRow(TABLE, scoped.rows, (r) => r.id);
          },
        );
      },
    );
  });

  it('FDC-03 the settings page reads the payout rules, and changing them is refused to the analyst', () => {
    visitAndRead<{ coinSettings: { pod_join_earn_pct: number } }>('finance', '/duncit-coin/settings', 'FinanceCoinSettings')
      .its('coinSettings.pod_join_earn_pct')
      .should('be.a', 'number');
    expectApiRefused('finance', account, UPDATE_COIN_SETTINGS, { input: {} }, 'updateCoinSettings');
  });

  it('FDC-04 granting or deducting a member\'s coins, and finding the member, are refused to the analyst', () => {
    expectApiRefused('finance', account, COIN_USER_SEARCH, { term: account.email }, 'coinUserSearch');
    expectApiRefused(
      'finance',
      account,
      ADJUST_USER_COINS,
      { user_id: ZERO_ID, direction: 'GRANT', coins: 1, reason: 'e2e refusal probe' },
      'adjustUserCoins',
    );
  });
});
