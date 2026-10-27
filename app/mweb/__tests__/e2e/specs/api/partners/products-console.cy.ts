/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
} from '../../../support/access-steps';
import {
  expectEachRefused,
  expectPage,
  expectPortalRefused,
  productFlagOn,
  productRefusal,
} from '../../../support/api-partners';

/**
 * The Products console (products.duncit.com) — the Duncit catalogue, partner
 * brands, warehouses, Pod Shop orders, catalogue deletions, Pod Shop returns
 * and cart settings. Its sign-in is PRODUCTS_MANAGER's; a Partner Brand
 * partner (ECOMM_MANAGER) is a seller, not Products staff, and is refused
 * every one of them. Each operation's role check is its resolver's first line,
 * behind the product flag. Scenario map: Partners › Duncit catalogue, Partner
 * brands, Warehouses, Order fulfilment, Catalogue deletion, Pod Shop returns,
 * Cart settings, Brand review (/ecomm/brands).
 */

const READS = [
  ['inventoryProductsTable', `query E2ePcCatalogue { inventoryProductsTable(query: { page_size: 1 }) { total } }`],
  ['marketplaceBrandsTable', `query E2ePcBrands { marketplaceBrandsTable(query: { page_size: 1 }) { total } }`],
  ['productOrdersTable', `query E2ePcOrders { productOrdersTable(query: { page_size: 1 }) { total } }`],
  ['ecommBrandsTable', `query E2ePcBrandReview { ecommBrandsTable(query: { page_size: 1 }) { total } }`],
] as const;
const PRODUCTS_TEAM_ONLY = [
  [
    'catalogDeletionRequestsTable',
    `query E2ePcDeletions { catalogDeletionRequestsTable(kind: PRODUCT, query: { page_size: 1 }) { total } }`,
  ],
  ['updateProductCartSettings', `mutation E2ePcCartSettings { updateProductCartSettings(input: {}) { __typename } }`],
] as const;
const WAREHOUSES = [
  'brandPickupLocations',
  `query E2ePcWarehouses { brandPickupLocations(owner_kind: BRAND) { __typename } }`,
] as const;
const RETURNS = ['podShopReturnsTable', `query E2ePcReturns { podShopReturnsTable(query: { page_size: 1 }) { total } }`] as const;

describe('API · The Products console is Products staff’s, never a brand partner’s', { testIsolation: false }, () => {
  let memberToken = '';
  let partnerToken = '';
  let cityAdminToken = '';
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

  it('PC-01 a brand partner cannot sign in to the Products console', () => {
    expectPortalRefused('products');
  });

  it('PC-02 every Products console operation is refused signed out, to a member and to a brand partner', () => {
    [...READS, ...PRODUCTS_TEAM_ONLY, WAREHOUSES].forEach(([field, query]) => {
      expectEachRefused(field, query, {}, [
        [null, productRefusal(flagOn, SIGNED_OUT)],
        [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
        [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
      ]);
    });
  });

  it('PC-03 Pod Shop returns are refused signed out and to a member', () => {
    expectEachRefused(RETURNS[0], RETURNS[1], {}, [
      [null, productRefusal(flagOn, SIGNED_OUT)],
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
  });

  it('PC-04 a city admin reads the catalogue, brands and orders but not the deletion queue or cart settings', () => {
    if (flagOn) {
      READS.forEach(([field, query]) => {
        cy.gqlRaw(query, {}, { token: cityAdminToken }).then((body) => expectPage(field, body));
      });
    }
    PRODUCTS_TEAM_ONLY.forEach(([field, query]) => {
      expectEachRefused(field, query, {}, [[cityAdminToken, productRefusal(flagOn, ACCESS_DENIED)]]);
    });
  });
});
