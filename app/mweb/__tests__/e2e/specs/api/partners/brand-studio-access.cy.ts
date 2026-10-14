/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  AUTH_REQUIRED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
  type Refusal,
} from '../../../support/access-steps';
import { expectAnswer, expectEachRefused, productFlagOn, productRefusal } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The Partner Brand studio pages (partners-app /ecomm/dashboard,
 * /ecomm-brand/orders, returns, deletion, settings and integrations) — never the
 * pet store. Each read is scoped to the brands the caller owns: orders and
 * returns filter by the caller's brand ids (commerce/productOrder/productOrder.brand.ts,
 * commerce/podShopReturn), pickup addresses and the dashboard look the brand
 * up by id AND owner, deletion requests need the brand partner role. A partner
 * who owns no brand therefore reads nothing at all. Everything but the
 * dashboard sits behind the product flag. Scenario map: Partners › Brand
 * dashboard, Brand integrations, Brand orders, Brand returns, Brand deletion,
 * Brand pickup addresses.
 */

const STATS = `query E2eBrandStats($id: ID) { partnerEcommStats(brand_doc_id: $id) { total_brands total_products } }`;
const ORDERS = `query E2eBrandOrders($id: ID) { brandProductOrdersTable(brand_id: $id, query: { page_size: 1 }) { total } }`;
const ORDER = `query E2eBrandOrder($id: ID!) { brandProductOrder(id: $id) { id } }`;
const CANCEL = `mutation E2eBrandCancel($id: ID!) { brandCancelProductOrder(id: $id, reason: "e2e") { id } }`;
const RETURNS = `query E2eBrandReturns { podShopReturnsTable(query: { page_size: 1 }) { total } }`;
const DELETIONS = `query E2eBrandDeletions { myCatalogDeletionRequests { id } }`;
const PICKUPS = `query E2eBrandPickups($id: ID!) { myBrandPickupLocations(brand_doc_id: $id) { __typename } }`;
const DELETE_PICKUP = `mutation E2eBrandDeletePickup($id: ID!) { deleteMyBrandPickupLocation(brand_doc_id: $id, id: $id) }`;
const INTEGRATIONS = `query E2eBrandIntegrations { myPartnerIntegrations { id } }`;

const ORDER_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Order not found' };
const BRAND_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Brand not found' };

describe('API · The Partner Brand studio shows a partner their own brands only', { testIsolation: false }, () => {
  let memberToken = '';
  let partnerToken = '';
  let flagOn = false;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    productFlagOn().then((on) => {
      flagOn = on;
    });
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('BS-01 the brand dashboard is refused signed out, counts nothing without a brand, and refuses another brand', () => {
    expectEachRefused('partnerEcommStats', STATS, {}, [[null, SIGNED_OUT]]);
    cy.gqlRaw(STATS, {}, { token: memberToken }).then((body) =>
      expectAnswer('partnerEcommStats', body, { total_brands: 0, total_products: 0 }),
    );
    expectEachRefused('partnerEcommStats', STATS, { id: NO_ID }, [
      [memberToken, { code: 'NOT_FOUND', message: 'Brand not found or not yours' }],
    ]);
  });

  it('BS-02 another brand’s orders are not listed, opened or cancelled', () => {
    expectEachRefused('brandProductOrdersTable', ORDERS, {}, [[null, productRefusal(flagOn, SIGNED_OUT)]]);
    if (flagOn) {
      cy.gqlRaw(ORDERS, { id: NO_ID }, { token: partnerToken }).then((body) =>
        expectAnswer('brandProductOrdersTable', body, { total: 0 }),
      );
    }
    expectEachRefused('brandProductOrder', ORDER, { id: NO_ID }, [[partnerToken, productRefusal(flagOn, ORDER_NOT_FOUND)]]);
    expectEachRefused('brandCancelProductOrder', CANCEL, { id: NO_ID }, [
      [partnerToken, productRefusal(flagOn, ORDER_NOT_FOUND)],
    ]);
  });

  it('BS-03 returns are refused to a member, and a partner with no brand sees none of anyone’s', () => {
    expectEachRefused('podShopReturnsTable', RETURNS, {}, [
      [null, productRefusal(flagOn, SIGNED_OUT)],
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
    if (flagOn) {
      cy.gqlRaw(RETURNS, {}, { token: partnerToken }).then((body) =>
        expectAnswer('podShopReturnsTable', body, { total: 0 }),
      );
    }
  });

  it('BS-04 deletion requests are refused to a member and empty for a partner with no brand', () => {
    expectEachRefused('myCatalogDeletionRequests', DELETIONS, {}, [[memberToken, productRefusal(flagOn, ACCESS_DENIED)]]);
    if (flagOn) {
      cy.gqlRaw(DELETIONS, {}, { token: partnerToken }).then((body) => expectAnswer('myCatalogDeletionRequests', body, []));
    }
  });

  it('BS-05 another brand’s pickup addresses cannot be read or removed', () => {
    expectEachRefused('myBrandPickupLocations', PICKUPS, { id: NO_ID }, [
      [null, productRefusal(flagOn, SIGNED_OUT)],
      [partnerToken, productRefusal(flagOn, BRAND_NOT_FOUND)],
    ]);
    expectEachRefused('deleteMyBrandPickupLocation', DELETE_PICKUP, { id: NO_ID }, [
      [partnerToken, productRefusal(flagOn, BRAND_NOT_FOUND)],
    ]);
  });

  it('BS-06 payment and courier integrations are the caller’s own: none for a partner who linked none', () => {
    expectEachRefused('myPartnerIntegrations', INTEGRATIONS, {}, [[null, productRefusal(flagOn, AUTH_REQUIRED)]]);
    if (flagOn) {
      cy.gqlRaw(INTEGRATIONS, {}, { token: partnerToken }).then((body) => expectAnswer('myPartnerIntegrations', body, []));
    }
  });
});
