/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
  type Refusal,
} from '../../../support/access-steps';
import { expectEachRefused, productFlagOn, productRefusal, whenShopOn } from '../../../support/api-partners';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Pod Shop orders and returns in the Products console (/orders, /returns).
 * Order operations are OPS_RW (SUPER_ADMIN, CITY_ADMIN, PRODUCTS_MANAGER,
 * FINANCE_MANAGER) and the money ones — force cancel, refund retry — CANCEL_RW
 * without CITY_ADMIN (commerce/productOrder/productOrder.resolver.ts). Returns
 * act as STAFF for SUPER_ADMIN/PRODUCTS_MANAGER/FINANCE_MANAGER, as BRAND
 * (own brands only) for ECOMM_MANAGER, and refuse everyone else
 * (podShopReturn.resolver.ts `actorOf`). A city admin is the grantable OPS_RW
 * role; every write here names an order or return no record has, so the
 * server's own lookup answers and no real order, refund or courier is touched.
 * Scenario map: Products › Orders & Fulfilment (browse, move status, cancel &
 * refund, denied roles), Pod Shop Returns, Product Returns (denied roles,
 * brand scoping).
 */

const TABLE = `query E2ePoTable($query: TableQueryInput) {
  productOrdersTable(query: $query) { total rows { order_no fulfilment_status } }
}`;
const ORDER = `query E2ePoOrder($id: ID!) { productOrder(id: $id) { id } }`;
const OPS_ON_UNKNOWN = [
  ['advanceProductOrderStatus', `mutation E2ePoAdvance($id: ID!) { advanceProductOrderStatus(id: $id, status: SHIPPED, note: "e2e") { id } }`],
  ['setProductOrderFulfilmentMethod', `mutation E2ePoMethod($id: ID!) { setProductOrderFulfilmentMethod(id: $id, method: PICKUP) { id } }`],
  ['refreshProductOrderTracking', `mutation E2ePoTrack($id: ID!) { refreshProductOrderTracking(id: $id) { id } }`],
] as const;
const LABEL = `mutation E2ePoLabel($id: ID!) { productOrderShipmentFile(ids: [$id], kind: LABEL) { __typename } }`;
const MONEY = [
  ['forceCancelProductOrder', `mutation E2ePoCancel($id: ID!) { forceCancelProductOrder(id: $id, reason: "e2e") { id } }`],
  ['retryProductOrderRefund', `mutation E2ePoRetry($id: ID!) { retryProductOrderRefund(id: $id) { id } }`],
] as const;

const RETURNS = `query E2ePrTable($brand: ID) { podShopReturnsTable(query: { page_size: 5 }, brand_id: $brand) { total rows { id } } }`;
const RETURN_ACTIONS = [
  ['approvePodShopReturn', `mutation E2ePrApprove($id: ID!) { approvePodShopReturn(id: $id) { id } }`],
  ['retryPodShopReturnPickup', `mutation E2ePrPickup($id: ID!) { retryPodShopReturnPickup(id: $id) { id } }`],
  ['markPodShopReturnReceived', `mutation E2ePrReceived($id: ID!) { markPodShopReturnReceived(id: $id) { id } }`],
  ['refundPodShopReturn', `mutation E2ePrRefund($id: ID!) { refundPodShopReturn(id: $id) { id } }`],
  ['retryPodShopReturnRefund', `mutation E2ePrRetryRefund($id: ID!) { retryPodShopReturnRefund(id: $id) { id } }`],
] as const;
const REJECT = `mutation E2ePrReject($id: ID!, $note: String!) { rejectPodShopReturn(id: $id, note: $note) { id } }`;

const ORDER_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Order not found' };
const RETURN_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Return not found' };

describe('API · Pod Shop orders and returns: ops move orders, only Products and Finance send money back', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';
  let partnerToken = '';
  let flagOn = false;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    productFlagOn().then((on) => {
      flagOn = on;
    });
    signInRunAs(['CITY_ADMIN']).then((token) => {
      cityAdminToken = token;
    });
    revokeRunRoles(['CITY_ADMIN']);
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('PO-01 the orders table filters by status and finds nothing for a search no order matches', () => {
    const delivered = { page_size: 20, filters: [{ field: 'fulfilment_status', op: 'eq', value: 'DELIVERED' }] };
    cy.gqlRaw(TABLE, { query: delivered }, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, 'productOrdersTable', body, (b) => {
        expect(b.errors).to.be.undefined;
        const page = b.data?.productOrdersTable as { total: number; rows: Array<{ fulfilment_status: string }> };
        expect(page.total).to.be.at.least(page.rows.length);
        page.rows.forEach((row) => expect(row.fulfilment_status, 'only delivered orders').to.equal('DELIVERED'));
      }),
    );
    const nothing = { page_size: 5, search: `e2e-no-order-${runAccount().stamp}` };
    cy.gqlRaw(TABLE, { query: nothing }, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, 'productOrdersTable', body, (b) => {
        expect(b.errors).to.be.undefined;
        expect(b.data?.productOrdersTable).to.deep.equal({ total: 0, rows: [] });
      }),
    );
  });

  it('PO-02 an order id no order has opens nothing, and cannot be moved, switched, tracked or labelled', () => {
    cy.gqlRaw(ORDER, { id: NO_ID }, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, 'productOrder', body, (b) => {
        expect(b.errors).to.be.undefined;
        expect(b.data?.productOrder, 'no such order').to.be.null;
      }),
    );
    OPS_ON_UNKNOWN.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [[cityAdminToken, productRefusal(flagOn, ORDER_NOT_FOUND)]]);
    });
    expectEachRefused('productOrderShipmentFile', LABEL, { id: NO_ID }, [
      [cityAdminToken, productRefusal(flagOn, { code: 'NOT_FOUND', message: 'No orders selected' })],
    ]);
  });

  it('PO-03 a member and a brand partner cannot move a platform order', () => {
    OPS_ON_UNKNOWN.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [null, productRefusal(flagOn, SIGNED_OUT)],
        [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
        [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
      ]);
    });
  });

  it('PO-04 force cancel and refund retry are refused to a city admin, a brand partner and a member', () => {
    MONEY.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [cityAdminToken, productRefusal(flagOn, ACCESS_DENIED)],
        [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
        [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      ]);
    });
  });

  it('PR-01 the returns desk refuses a signed-out caller, a member and a city admin', () => {
    expectEachRefused('podShopReturnsTable', RETURNS, {}, [
      [null, productRefusal(flagOn, SIGNED_OUT)],
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      [cityAdminToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
  });

  it('PR-02 a brand partner sees only their own brands’ returns — none for a partner who owns no brand', () => {
    [{}, { brand: NO_ID }].forEach((variables) => {
      cy.gqlRaw(RETURNS, variables, { token: partnerToken }).then((body) =>
        whenShopOn(flagOn, 'podShopReturnsTable', body, (b) => {
          expect(b.errors).to.be.undefined;
          expect(b.data?.podShopReturnsTable).to.deep.equal({ total: 0, rows: [] });
        }),
      );
    });
  });

  it('PR-03 no return decision, pickup, receipt or refund is open to a city admin or a member', () => {
    RETURN_ACTIONS.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [cityAdminToken, productRefusal(flagOn, ACCESS_DENIED)],
        [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      ]);
    });
  });

  it('PR-04 a brand partner rejecting needs a note first, and cannot act on a return outside their brands', () => {
    expectEachRefused('rejectPodShopReturn', REJECT, { id: NO_ID, note: '   ' }, [
      [partnerToken, productRefusal(flagOn, { code: 'BAD_REQUEST', message: 'Tell the buyer why the return is not accepted' })],
    ]);
    expectEachRefused('rejectPodShopReturn', REJECT, { id: NO_ID, note: 'e2e' }, [[partnerToken, productRefusal(flagOn, RETURN_NOT_FOUND)]]);
    RETURN_ACTIONS.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [[partnerToken, productRefusal(flagOn, RETURN_NOT_FOUND)]]);
    });
  });
});
