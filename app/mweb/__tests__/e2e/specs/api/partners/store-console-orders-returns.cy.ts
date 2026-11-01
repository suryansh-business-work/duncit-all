/// <reference types="cypress" />
import { revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { expectStoreAdminOnly, type StoreCall } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The pet store console's (ecomm-portal) orders, shipping and after-sale desks
 * — Partner Brand and the Pod Shop are other products. Every operation is
 * wrapped by `admin()` → `requireStoreAdmin` (SUPER_ADMIN,
 * ECOMM_STORE_MANAGER: store.admin.resolver.ts, store.shipping.resolver.ts),
 * neither grantable to a run account, so the console side is asserted as
 * refusals to a signed-out caller, a member, a Partner Brand partner
 * (ECOMM_MANAGER) and other staff (CITY_ADMIN). Each names an order, return,
 * review, warehouse or pincode no record has, so even a broken guard would
 * reach nothing: no order is moved or cancelled, no refund or courier booked,
 * no ShipRocket address made. The storefront side asserts the delivery check
 * the pincode list drives, and that an unknown product carries no reviews.
 * Scenario map: Ecomm Portal › Orders & Shipping (status & notes, admin
 * cancel, booking & labels, NDR & COD, warehouses & ShipRocket, pincodes),
 * Returns, Reviews & Customers.
 */

const byId = { id: NO_ID };
const ORDERS: readonly StoreCall[] = [
  ['storeAdminOrder', `query E2eSoOrder($id: ID!) { storeAdminOrder(id: $id) { is_guest } }`, byId],
  ['storeUpdateOrderStatus', `mutation E2eSoStatus($id: ID!) { storeUpdateOrderStatus(id: $id, status: SHIPPED, note: "e2e") { id } }`, byId],
  [
    'storeAdminCancelOrder',
    `mutation E2eSoCancel($id: ID!) { storeAdminCancelOrder(id: $id, reason: "e2e", refund_mode: ORIGINAL) { id } }`,
    byId,
  ],
  ['storeMarkCodCollected', `mutation E2eSoCod($id: ID!) { storeMarkCodCollected(id: $id) { id } }`, byId],
  ['storeShipmentCouriers', `query E2eSoCouriers($id: ID!) { storeShipmentCouriers(id: $id) { courier_name } }`, byId],
  ['storeBookShipment', `mutation E2eSoBook($id: ID!) { storeBookShipment(id: $id) { id } }`, byId],
  ['storeShipmentFile', `mutation E2eSoLabel($id: ID!) { storeShipmentFile(ids: [$id], kind: LABEL) { filename } }`, byId],
  ['storeShipmentAlerts', `query E2eSoAlerts { storeShipmentAlerts { id } }`],
  ['storeRetryFailedBookings', `mutation E2eSoRetry { storeRetryFailedBookings { attempted } }`],
  ['storeAnswerNdr', `mutation E2eSoNdr($id: ID!) { storeAnswerNdr(id: $id, action: REATTEMPT) { id } }`, byId],
  ['storeCodLedger', `query E2eSoLedger { storeCodLedger(days: 30) { outstanding } }`],
];

const SHIPPING: readonly StoreCall[] = [
  ['storeShiprocketStatus', `query E2eSsStatus { storeShiprocketStatus { configured } }`],
  ['storeShiprocketReconnect', `mutation E2eSsReconnect { storeShiprocketReconnect { configured } }`],
  [
    'storeSaveWarehouse',
    `mutation E2eSsSave { storeSaveWarehouse(input: {
      nickname: "e2e-refused", contact_name: "E2E", phone: "9876543210", email: "e2e@example.com",
      address_line1: "12 Residency Road, Ashok Nagar", city: "Bengaluru", state: "Karnataka", pincode: "560025"
    }) { id } }`,
  ],
  ['storeDeleteWarehouse', `mutation E2eSsDelete($id: ID!) { storeDeleteWarehouse(id: $id) }`, byId],
  ['storeRegisterWarehouse', `mutation E2eSsRegister($id: ID!) { storeRegisterWarehouse(id: $id) { id } }`, byId],
  ['storeSaveServiceablePincode', `mutation E2eSsPin { storeSaveServiceablePincode(input: { pincode: "560025" }) { id } }`],
  ['storeDeleteServiceablePincode', `mutation E2eSsPinDel($id: ID!) { storeDeleteServiceablePincode(id: $id) }`, byId],
];

const AFTER_SALE: readonly StoreCall[] = [
  ['storeReturnsTable', `query E2eSrReturns { storeReturnsTable(query: { page_size: 1 }) { total } }`],
  ['storeUpdateReturn', `mutation E2eSrUpdate($id: ID!) { storeUpdateReturn(id: $id, input: { status: REFUNDED, refund_amount: 1, refund_mode: ORIGINAL }) { id } }`, byId],
  ['storeBookReturnPickup', `mutation E2eSrPickup($id: ID!) { storeBookReturnPickup(id: $id) { id } }`, byId],
  ['storeRestockReturn', `mutation E2eSrRestock($id: ID!) { storeRestockReturn(id: $id) { id } }`, byId],
  ['storeReplyReview', `mutation E2eSrReply($id: ID!) { storeReplyReview(id: $id, reply: "e2e") }`, byId],
  ['storeDeleteReview', `mutation E2eSrDeleteReview($id: ID!) { storeDeleteReview(id: $id) }`, byId],
  ['storeCustomerOrders', `query E2eSrCustomer { storeCustomerOrders(email: "nobody@example.com") { id } }`],
];

const PINCODE = `query E2eSsCheck($pin: String!) { storePincodeServiceable(pincode: $pin) { pincode serviceable restricted } }`;
const REVIEWS = `query E2eSrReviews($id: ID!) { storeProductReviews(product_id: $id) { id } }`;

interface PincodeCheck {
  pincode: string;
  serviceable: boolean;
  restricted: boolean;
}

describe('API · Pet store orders, shipping and after-sale desks are the store team’s alone', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';
  let partnerToken = '';

  const tokens = () => [memberToken, partnerToken, cityAdminToken];

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
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

  it('EO-01 order status, notes, cancellation, COD, booking, labels, NDR and the COD ledger refuse everyone without a store role', () => {
    expectStoreAdminOnly(ORDERS, tokens());
  });

  it('EO-02 ShipRocket status, reconnect, warehouses and serviceable pincodes refuse everyone without a store role', () => {
    expectStoreAdminOnly(SHIPPING, tokens());
  });

  it('EO-03 the storefront delivery check reads only digits, and never serves a pincode that is not six of them', () => {
    cy.gql<{ storePincodeServiceable: PincodeCheck }>(PINCODE, { pin: '12' }, { token: null })
      .its('storePincodeServiceable')
      .then((check) => {
        expect(check.pincode).to.equal('12');
        expect(check.serviceable, 'a short pincode is never served').to.equal(false);
        expect(check.restricted).to.be.a('boolean');
      });
    cy.gql<{ storePincodeServiceable: PincodeCheck }>(PINCODE, { pin: ' 56-00 25 ' }, { token: null })
      .its('storePincodeServiceable.pincode')
      .should('equal', '560025');
  });

  it('ER-01 returns, refunds, pickups, review replies and customer histories refuse everyone without a store role', () => {
    expectStoreAdminOnly(AFTER_SALE, tokens());
  });

  it('ER-02 a product the store does not have shows no reviews on the storefront', () => {
    cy.gql<{ storeProductReviews: unknown[] }>(REVIEWS, { id: NO_ID }, { token: null }).its('storeProductReviews').should('deep.equal', []);
  });
});
