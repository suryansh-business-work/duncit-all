/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectOutsidersRefused, expectRead, type StaffCall } from '../../../support/api-staff';

/**
 * Admin › User › Payment & Refund Logs and Shop Orders, read for ONE account —
 * the run account's own, so every figure is about a member this run owns.
 *
 *   paymentsTable, userRefundsTable, userFinanceSummary  finance/payment LOG_READ =
 *     SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER, ZONAL_ADMIN, FINANCE_USER, LOGS_MANAGER
 *   the summary's coin half and coinTransactionsTable    finance/coin COIN_LOG_READ =
 *     LOYALTY_ADMIN_READ (no ZONAL_ADMIN) + LOGS_MANAGER — a role without it gets coins: null
 *   userProductOrdersTable                               commerce/productOrder USER_ORDERS_READ =
 *     SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER, PRODUCTS_MANAGER
 *
 * The tables are narrowed by the `user_id` filter both servers allowlist; the
 * summary counts the same payments (payment.userSummary.service.ts: captured =
 * SUCCESS or REFUNDED, refunded = carries metadata.refunded_at, the rule
 * userRefundsTable lists by). SUPPORT_USER opens Admin but reads none of it.
 * Scenario map: Staff › Admin: User Payments, Coins & Shop Orders.
 */

const ROLES: readonly E2eStaffRole[] = ['FINANCE_USER', 'ZONAL_ADMIN', 'SUPPORT_USER'];
const ME = `query E2eUserMoneyMe { me { user_id } }`;

const byUser = (userId: string) => ({ query: { page_size: 100, filters: [{ field: 'user_id', op: 'eq', value: userId }] } });

interface Summary {
  payment_count: number;
  failed_count: number;
  paid_total: number;
  refund_count: number;
  refunded_total: number;
  net_business: number;
  coins: { balance: number; credited: number; debited: number } | null;
}

const calls = (userId: string) => ({
  summary: call(
    'userFinanceSummary',
    `query E2eUserSummary($id: ID!) { userFinanceSummary(user_id: $id) {
      payment_count failed_count paid_total refund_count refunded_total net_business coins { balance credited debited } } }`,
    { id: userId },
  ),
  payments: call(
    'paymentsTable',
    `query E2eUserPayments($query: TableQueryInput) { paymentsTable(query: $query) { total rows { user_id status } } }`,
    byUser(userId),
  ),
  refunds: call('userRefundsTable', `query E2eUserRefunds($query: TableQueryInput) { userRefundsTable(query: $query) { total } }`, byUser(userId)),
  coins: call('coinTransactionsTable', `query E2eUserCoins($query: TableQueryInput) { coinTransactionsTable(query: $query) { total } }`, byUser(userId)),
  orders: call(
    'userProductOrdersTable',
    `query E2eUserOrders($id: ID!) { userProductOrdersTable(user_id: $id, query: { page_size: 100 }) { total rows { buyer_id } } }`,
    { id: userId },
  ),
});

const round2 = (n: number) => Math.round(n * 100) / 100;

describe('API · One member’s payments, coins and shop orders, per admin seat', { testIsolation: false }, () => {
  let memberToken = '';
  let runUserId = '';
  let ops: ReturnType<typeof calls>;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      cy.gql<{ me: { user_id: string } }>(ME, {}, { token }).then(({ me }) => {
        runUserId = me.user_id;
        ops = calls(runUserId);
      });
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('UP-01 FINANCE_USER reads the account’s payments, refunds and coins, and the summary adds up to them', () => {
    asRole('FINANCE_USER', (token) => {
      expectRead<Summary>(token, ops.summary).then((summary) => {
        expect(summary.coins, 'a Duncit Coin reader gets the coin half').to.not.be.null;
        expect(summary.net_business, 'net = paid - refunded').to.equal(round2(summary.paid_total - summary.refunded_total));
        expectRead<{ total: number; rows: Array<{ user_id: string; status: string }> }>(token, ops.payments).then((page) => {
          page.rows.forEach((row) => expect(row.user_id, 'payment belongs to the account').to.equal(runUserId));
          expect(summary.payment_count + summary.failed_count, 'captured + failed within all payments').to.be.at.most(page.total);
          if (page.total <= page.rows.length) {
            const captured = page.rows.filter((r) => r.status === 'SUCCESS' || r.status === 'REFUNDED').length;
            expect(summary.payment_count, 'captured payments').to.equal(captured);
          }
        });
        expectRead<{ total: number }>(token, ops.refunds).then((page) => {
          expect(page.total, 'refunds listed = refunds counted').to.equal(summary.refund_count);
        });
      });
      expectRead<{ total: number }>(token, ops.coins).then((page) => expect(page.total, 'coin moves').to.be.at.least(0));
    });
  });

  it('UP-02 FINANCE_USER is refused the account’s Pod Shop orders', () => {
    asRole('FINANCE_USER', (token) => expectCallsRefused(token, [ops.orders]));
  });

  it('UP-03 ZONAL_ADMIN reads payments and shop orders, but the summary has no coin half and the coin ledger is refused', () => {
    asRole('ZONAL_ADMIN', (token) => {
      expectRead<Summary>(token, ops.summary).then((summary) => {
        expect(summary.coins, 'no Duncit Coin read, no coin half').to.be.null;
      });
      expectRead<{ total: number }>(token, ops.payments);
      expectRead<{ total: number; rows: Array<{ buyer_id: string | null }> }>(token, ops.orders).then((page) => {
        page.rows.forEach((row) => expect(row.buyer_id, 'order placed by the account').to.equal(runUserId));
      });
      expectCallsRefused(token, [ops.coins]);
    });
  });

  it('UP-04 SUPPORT_USER, a member and a signed-out caller read none of the tabs', () => {
    const all = (): StaffCall[] => [ops.summary, ops.payments, ops.refunds, ops.coins, ops.orders];
    asRole('SUPPORT_USER', (token) => expectCallsRefused(token, all()));
    expectOutsidersRefused(memberToken, all());
  });
});
