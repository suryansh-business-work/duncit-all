/// <reference types="cypress" />
import { expectRefused, revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { expectStoreAdminOnly, guestCartToken, type StoreCall } from '../../../support/api-partners';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The pet store console's (ecomm-portal, for ecomm.duncit.com) catalogue and
 * marketing — a separate product from Partner Brand. Every write here is
 * wrapped by `admin()` → `requireStoreAdmin` (SUPER_ADMIN, ECOMM_STORE_MANAGER:
 * commerce/store/store.admin.resolver.ts); neither role is grantable to a run
 * account, so the console side is asserted as refusals — signed out, a member,
 * a Partner Brand partner (ECOMM_MANAGER) and other staff (CITY_ADMIN) — with
 * no product, taxonomy, coupon or email made. The storefront side asserts what
 * the shopper sees of that work: an unknown product, aisle or collection is
 * not on the shelf, and a code that is no live coupon is refused at the cart.
 * The table reads are store-admin-access SAD-03..14. Scenario map: Ecomm
 * Portal › Catalogue (products, taxonomy, home sections), Marketing (coupons,
 * abandoned-cart reminders, back-in-stock emails).
 */

const CATALOGUE: readonly StoreCall[] = [
  ['storeSaveProduct', `mutation E2eScSave { storeSaveProduct(input: { product_name: "e2e" }, status: DRAFT) { id } }`],
  ['storeSetProductStatus', `mutation E2eScStatus($ids: [ID!]!) { storeSetProductStatus(ids: $ids, status: PUBLISHED) }`, { ids: [NO_ID] }],
  ['storeAdminProduct', `query E2eScProduct($id: ID!) { storeAdminProduct(id: $id) { id } }`, { id: NO_ID }],
  ['storeSavePetType', `mutation E2eScPet { storeSavePetType(input: { name: "e2e" }) { id } }`],
  ['storeDeletePetType', `mutation E2eScPetDel($id: ID!) { storeDeletePetType(id: $id) }`, { id: NO_ID }],
  ['storeSaveCategory', `mutation E2eScCat { storeSaveCategory(input: { name: "e2e" }) { id } }`],
  ['storeDeleteCategory', `mutation E2eScCatDel($id: ID!) { storeDeleteCategory(id: $id) }`, { id: NO_ID }],
  ['storeSaveBrand', `mutation E2eScBrand { storeSaveBrand(input: { name: "e2e" }) { id } }`],
  ['storeReorderBrands', `mutation E2eScBrandOrder($ids: [ID!]!) { storeReorderBrands(ids: $ids) }`, { ids: [NO_ID] }],
  ['storeSaveFacet', `mutation E2eScFacet { storeSaveFacet(input: { name: "e2e", options: [] }) { id } }`],
  ['storeSaveCollection', `mutation E2eScCollection { storeSaveCollection(input: { name: "e2e", mode: MANUAL }) { id } }`],
  ['storeSaveSection', `mutation E2eScSection { storeSaveSection(input: { kind: HERO_SLIDER }) { id } }`],
  ['storeAdminSections', `query E2eScSections { storeAdminSections { id } }`],
];

const MARKETING: readonly StoreCall[] = [
  [
    'storeSaveCoupon',
    `mutation E2eSmCoupon { storeSaveCoupon(input: { code: "E2EPET10", discount_pct: 10, scope: STORE }) { id } }`,
  ],
  ['storeDeleteCoupon', `mutation E2eSmCouponDel($id: ID!) { storeDeleteCoupon(id: $id) }`, { id: NO_ID }],
  ['storeCartsTable', `query E2eSmCarts { storeCartsTable(query: { page_size: 1 }, abandoned_only: true) { total } }`],
  ['storeRemindCart', `mutation E2eSmRemind($id: ID!) { storeRemindCart(id: $id) }`, { id: NO_ID }],
  ['storeSendBackInStock', `mutation E2eSmBackInStock { storeSendBackInStock }`],
];

const SHELF = `query E2eScShelf($slug: String!) {
  storeProduct(slug: $slug) { id }
  storeCategory(slug: $slug) { id }
  storeCollection(slug: $slug) { id }
  storePetType(slug: $slug) { id }
}`;
const APPLY = `mutation E2eSmApply($token: String!, $code: String) { storeApplyCoupon(cart_token: $token, code: $code) { coupon_code } }`;
const CART = `query E2eSmCart($token: String!) { storeCart(cart_token: $token) { coupon_code coupon_discount lines { product_id } } }`;

describe('API · Pet store console catalogue and marketing are the store team’s alone', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';
  let partnerToken = '';

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

  it('EC-01 product, taxonomy and home-section writes are refused to everyone without a store role', () => {
    expectStoreAdminOnly(CATALOGUE, [memberToken, partnerToken, cityAdminToken]);
  });

  it('EC-02 a slug no listed product, aisle, collection or pet has is not on the shelf', () => {
    const slug = `e2e-not-listed-${runAccount().stamp}`;
    cy.gql<Record<string, unknown>>(SHELF, { slug }, { token: null }).should('deep.equal', {
      storeProduct: null,
      storeCategory: null,
      storeCollection: null,
      storePetType: null,
    });
  });

  it('EM-01 coupons, abandoned-cart reminders and back-in-stock emails are refused to everyone without a store role', () => {
    expectStoreAdminOnly(MARKETING, [memberToken, partnerToken, cityAdminToken]);
  });

  it('EM-02 a code that is no live store coupon is refused at the cart, and the cart keeps no coupon', () => {
    const token = guestCartToken('coupon');
    const code = `E2E-NONE-${runAccount().stamp}`;
    cy.gqlRaw(APPLY, { token, code }, { token: null }).then((body) =>
      expectRefused('storeApplyCoupon', body, { code: 'BAD_USER_INPUT', message: 'Invalid or inactive coupon code' }),
    );
    cy.gql<{ storeCart: { coupon_code: string; coupon_discount: number; lines: unknown[] } }>(CART, { token }, { token: null })
      .its('storeCart')
      .should('deep.equal', { coupon_code: '', coupon_discount: 0, lines: [] });
  });
});
