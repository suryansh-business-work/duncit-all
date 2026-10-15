import type { RunAccount } from '../../support/run-account';
import {
  SHOP_PAYMENTS_LOOKUP,
  apiRead,
  consoleAccount,
  expectFirstRow,
  expectRefundValuesAddUp,
  releaseConsoleRole,
  signIn,
  visitAndRead,
  type OrderRefundsPage,
  type ShopPaymentRow,
} from '../../support/ui-finance-crm';

/**
 * Finance › Pod Shop money, as the analyst seat (FINANCE_USER): the pod shop's
 * own Payment Logs (/pod-shop/payment-logs) and Order Refunds
 * (/pod-shop/order-refunds). The pod shop and the pet store (ecomm.duncit.com)
 * are different shops: PAYMENT_SHOP_FILTER (payment.source.ts) keeps every
 * pet-store payment out of this log, and a pod-shop payment is either a
 * standalone cart (PRODUCT) or a pod booking that carried shop add-ons (POD).
 */

const PAYMENTS_TABLE = 'finance-pod-shop-payments';
const REFUNDS_TABLE = 'finance-pod-shop-order-refunds';

describe('Finance · Pod Shop money (run account, password CHANGED)', () => {
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

  it('FPS-01 the pod shop payment log holds pod-shop payments only — none of the pet store\'s', () => {
    visitAndRead<{ shopPaymentsTable: { rows: ShopPaymentRow[] } }>(
      'finance',
      '/pod-shop/payment-logs',
      'ShopPaymentsTable',
    ).then(({ shopPaymentsTable }) => {
      const rows = shopPaymentsTable.rows;
      for (const row of rows) {
        expect(['PRODUCT', 'POD'], `payment ${row.id} is a shop cart or a booking with add-ons`).to.include(row.target_type);
      }
      expectFirstRow(PAYMENTS_TABLE, rows, (r) => r.id);
      apiRead<{ shopPaymentsTable: { rows: ShopPaymentRow[] } }>('finance', account, SHOP_PAYMENTS_LOOKUP, {
        shop: 'ECOMM',
        query: { page: 1, page_size: 100 },
      }).then((ecomm) => {
        const petStore = new Set(ecomm.shopPaymentsTable.rows.map((r) => r.id));
        const leaked = rows.filter((r) => petStore.has(r.id)).map((r) => r.id);
        expect(leaked, 'no pet-store payment appears in the pod shop log').to.deep.equal([]);
      });
    });
  });

  it('FPS-02 pod shop order refunds are each worth their cash plus coins, and the strip counts them all', () => {
    visitAndRead<OrderRefundsPage>('finance', '/pod-shop/order-refunds', 'ShopOrderRefundsTable').then(
      ({ shopOrderRefundsTable }) => {
        expectRefundValuesAddUp(shopOrderRefundsTable);
        expectFirstRow(REFUNDS_TABLE, shopOrderRefundsTable.rows, (r) => r.id);
        cy.byTestId('finance-order-refunds-destination-hint').should('be.visible');
      },
    );
  });
});
