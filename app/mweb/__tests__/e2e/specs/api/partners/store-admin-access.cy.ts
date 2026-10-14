/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
} from '../../../support/access-steps';
import { expectEachRefused, expectPortalRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The pet store admin (ecomm-portal, for ecomm.duncit.com) — a separate
 * product from Partner Brand. Every admin field is wrapped by `admin()`, which
 * runs `requireStoreAdmin` (SUPER_ADMIN, ECOMM_STORE_MANAGER —
 * commerce/store/store.shared.ts) before the service; the portal's sign-in
 * asks for ECOMM_STORE_MANAGER. A Partner Brand partner (ECOMM_MANAGER) is
 * therefore turned away from both. The member's refusal of the orders table,
 * an order, the settings and a coupon delete is staff-operations SA-24/25/45/46.
 * Scenario map: Partners › Store access (separation), Store catalogue, coupons,
 * shipping, returns, reviews, carts, customers, stock, payments, pages,
 * settings, orders (/orders/:id).
 */

const PAGES = [
  ['storeAdminProductsTable', `query E2eSaProducts { storeAdminProductsTable(query: { page_size: 1 }) { __typename } }`, {}],
  ['storeCouponsTable', `query E2eSaCoupons { storeCouponsTable(query: { page_size: 1 }) { __typename } }`, {}],
  ['storeServiceablePincodesTable', `query E2eSaPincodes { storeServiceablePincodesTable { __typename } }`, {}],
  ['storePickupLocations', `query E2eSaPickups { storePickupLocations { __typename } }`, {}],
  ['storeAdminReturn', `query E2eSaReturn($id: ID!) { storeAdminReturn(id: $id) { __typename } }`, { id: NO_ID }],
  ['storeReviewsTable', `query E2eSaReviews { storeReviewsTable(query: { page_size: 1 }) { __typename } }`, {}],
  ['storeCartsTable', `query E2eSaCarts { storeCartsTable(query: { page_size: 1 }) { __typename } }`, {}],
  ['storeCustomersTable', `query E2eSaCustomers { storeCustomersTable(query: { page_size: 1 }) { __typename } }`, {}],
  ['storeStockAlertsTable', `query E2eSaStock { storeStockAlertsTable(query: { page_size: 1 }) { __typename } }`, {}],
  ['storePaymentsTable', `query E2eSaPayments { storePaymentsTable(query: { page_size: 1 }) { __typename } }`, {}],
  ['storeAdminPages', `query E2eSaPages { storeAdminPages { __typename } }`, {}],
  [
    'storeAddOrderNote',
    `mutation E2eSaOrderNote($id: ID!) { storeAddOrderNote(id: $id, text: "e2e") { __typename } }`,
    { id: NO_ID },
  ],
] as const;
const SETTINGS = `query E2eSaSettings { storeAdminSettings { __typename } }`;
const ORDERS = `query E2eSaOrders { storeOrdersTable(query: { page_size: 1 }) { __typename } }`;

describe('API · The pet store admin is the store team’s, and never a Partner Brand partner’s', { testIsolation: false }, () => {
  let memberToken = '';
  let brandPartnerToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      brandPartnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('SAD-01 a Partner Brand partner (ECOMM_MANAGER) cannot sign in to the pet store admin', () => {
    expectPortalRefused('ecomm-portal');
  });

  it('SAD-02 a Partner Brand partner is refused the store’s orders and settings', () => {
    expectEachRefused('storeOrdersTable', ORDERS, {}, [[brandPartnerToken, ACCESS_DENIED]]);
    expectEachRefused('storeAdminSettings', SETTINGS, {}, [[brandPartnerToken, ACCESS_DENIED]]);
  });

  PAGES.forEach(([field, query, variables], index) => {
    it(`SAD-${String(index + 3).padStart(2, '0')} ${field} is refused signed out, to a member and to a brand partner`, () => {
      expectEachRefused(field, query, variables, [
        [null, SIGNED_OUT],
        [memberToken, ACCESS_DENIED],
        [brandPartnerToken, ACCESS_DENIED],
      ]);
    });
  });
});
