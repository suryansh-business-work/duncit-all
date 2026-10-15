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
 * Finance › Ecomm store money, as the analyst seat (FINANCE_USER): the pet
 * store's (ecomm.duncit.com) own Payment Logs (/ecomm/payment-logs) and Order
 * Refunds (/ecomm/order-refunds). Only payments the pet store's checkout
 * stamped belong here (PAYMENT_SHOP_FILTER.ECOMM in payment.source.ts) — never
 * a pod-shop cart, and never anything of the Partner Brand product.
 */

const PAYMENTS_TABLE = 'finance-ecomm-payments';
const REFUNDS_TABLE = 'finance-ecomm-order-refunds';

describe('Finance · Ecomm store money (run account, password CHANGED)', () => {
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

  it('FES-01 the pet store payment log holds none of the pod shop\'s payments', () => {
    visitAndRead<{ shopPaymentsTable: { rows: ShopPaymentRow[] } }>('finance', '/ecomm/payment-logs', 'ShopPaymentsTable').then(
      ({ shopPaymentsTable }) => {
        const rows = shopPaymentsTable.rows;
        expectFirstRow(PAYMENTS_TABLE, rows, (r) => r.id);
        apiRead<{ shopPaymentsTable: { rows: ShopPaymentRow[] } }>('finance', account, SHOP_PAYMENTS_LOOKUP, {
          shop: 'POD_SHOP',
          query: { page: 1, page_size: 100 },
        }).then((podShop) => {
          const podShopIds = new Set(podShop.shopPaymentsTable.rows.map((r) => r.id));
          const leaked = rows.filter((r) => podShopIds.has(r.id)).map((r) => r.id);
          expect(leaked, 'no pod-shop payment appears in the pet store log').to.deep.equal([]);
        });
      },
    );
  });

  it('FES-02 pet store order refunds are each worth their cash plus coins, and the strip counts them all', () => {
    visitAndRead<OrderRefundsPage>('finance', '/ecomm/order-refunds', 'ShopOrderRefundsTable').then(
      ({ shopOrderRefundsTable }) => {
        expectRefundValuesAddUp(shopOrderRefundsTable);
        expectFirstRow(REFUNDS_TABLE, shopOrderRefundsTable.rows, (r) => r.id);
      },
    );
  });
});
