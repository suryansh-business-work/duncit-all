/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused, guestCartToken } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';
import { storeProduct, storeSettings, type StoreCard } from '../../../support/ui-websites';

/**
 * Who sees what on the pet store (ecomm.duncit.com) — separate from Partner
 * Brand. Browsing and search are public and the same for everyone; a cart and
 * a wishlist belong to the signed-in account (`u:<id>`) or else to the guest's
 * key (`g:<token>`) — a signed-in caller's key is ignored, so nobody reads a
 * guest's cart by holding its key (store.shared.ts `resolveOwner`); reviews
 * need a delivered pet-store order of the product; addresses are looked up by
 * id AND owner. The order, invoice, return, tracking and Autoship refusals are
 * store-shopper-isolation SS-01..04; the console's are store-console-*.
 * Everything here reads, or writes only the run's own guest key and is undone.
 * Scenario map: Ecomm Store › Shopper Access & Privacy (browsing, search,
 * product, cart, account, engagement, settings).
 */

const BROWSE = `query E2eSpBrowse { storeSettings { store_name } storeNavigation { __typename } storeHome { __typename } }`;
const SEARCH = `query E2eSpSearch($q: String!) { storeSearch(input: { q: $q, page: 1, page_size: 24 }) { total items { id } } }`;
const PRODUCT = `query E2eSpProduct($slug: String!) { storeProduct(slug: $slug) { id } }`;
const REVIEW = `mutation E2eSpReview($id: ID!) { storeSubmitReview(input: { product_id: $id, rating: 4, comment: "e2e" }) { id } }`;
const ADD = `mutation E2eSpAdd($token: String, $id: ID!, $variant: String) {
  storeAddToCart(cart_token: $token, product_id: $id, variant_id: $variant, qty: 1) { lines { product_id } }
}`;
const CART = `query E2eSpCart($token: String) { storeCart(cart_token: $token) { lines { product_id } } }`;
const CLEAR = `mutation E2eSpClear($token: String) { storeClearCart(cart_token: $token) { item_count } }`;
const TOGGLE = `mutation E2eSpToggle($token: String, $id: ID!) { storeToggleWishlist(cart_token: $token, product_id: $id) }`;
const WISH = `query E2eSpWish($token: String) { storeWishlistIds(cart_token: $token) }`;
const ADDRESS_CALLS = [
  ['deleteMyAddress', `mutation E2eSpDelAddr($id: ID!) { deleteMyAddress(id: $id) }`],
  ['setDefaultMyAddress', `mutation E2eSpDefAddr($id: ID!) { setDefaultMyAddress(id: $id) { id } }`],
  [
    'saveMyAddress',
    `mutation E2eSpSaveAddr($id: ID!) { saveMyAddress(id: $id, input: { line1: "12 Residency Road", city: "Bengaluru", state: "Karnataka", pincode: "560025" }) { id } }`,
  ],
] as const;

const EXPIRED: Refusal = { code: 'BAD_USER_INPUT', message: 'Your cart session has expired — refresh the page' };

describe('API · Pet store privacy: browsing is public, carts and wishlists are their owner’s', { testIsolation: false }, () => {
  let memberToken = '';
  let product: StoreCard;
  const guest = guestCartToken('privacy');
  const variant = () => (product.has_variants ? product.lead_variant_id : null);

  before(() => {
    storeSettings();
    signInRunMember().then((token) => {
      memberToken = token;
    });
    storeProduct(() => true, 'for the cart and wishlist checks').then((card) => {
      product = card;
    });
  });

  after(() => {
    cy.gql(CLEAR, { token: guest }, { token: null });
    cy.gql<{ storeWishlistIds: string[] }>(WISH, { token: guest }, { token: null }).then(({ storeWishlistIds }) => {
      if (storeWishlistIds.includes(product.id)) cy.gql(TOGGLE, { token: guest, id: product.id }, { token: null });
    });
  });

  it('SP-01 the shelf, menu and settings answer without a sign-in', () => {
    cy.gqlRaw(BROWSE, {}, { token: null }).then((body) => {
      expect(body.errors, 'public browsing').to.be.undefined;
      expect(body.data?.storeSettings).to.have.property('store_name').that.is.a('string').and.not.empty;
    });
  });

  it('SP-02 search answers the same for a guest and a signed-in shopper, and a listed product page is public', () => {
    const q = product.title;
    type Search = { storeSearch: { total: number; items: Array<{ id: string }> } };
    const found = (s: Search) => ({ total: s.storeSearch.total, ids: s.storeSearch.items.map((i) => i.id).sort() });
    cy.gql<Search>(SEARCH, { q }, { token: null }).then((guestSearch) => {
      expect(found(guestSearch).ids, 'the product is found by its name').to.include(product.id);
      cy.gql<Search>(SEARCH, { q }, { token: memberToken }).then((memberSearch) => {
        expect(found(memberSearch), 'same results signed in').to.deep.equal(found(guestSearch));
      });
    });
    cy.gql<{ storeProduct: { id: string } | null }>(PRODUCT, { slug: product.slug }, { token: null })
      .its('storeProduct.id')
      .should('equal', product.id);
  });

  it('SP-03 only a buyer the product was delivered to can review it', () => {
    expectEachRefused('storeSubmitReview', REVIEW, { id: product.id }, [
      [null, SIGNED_OUT],
      [memberToken, { code: 'BAD_USER_INPUT', message: 'You can review a product once it has been delivered to you' }],
    ]);
    expectEachRefused('storeSubmitReview', REVIEW, { id: NO_ID }, [
      [memberToken, { code: 'BAD_USER_INPUT', message: 'You can review a product once it has been delivered to you' }],
    ]);
  });

  it('SP-04 a guest without a valid cart key has no cart', () => {
    [undefined, 'short', 'has spaces in it and is long enough!!'].forEach((token) => {
      cy.gqlRaw(CART, { token }, { token: null }).then((body) => expectRefused('storeCart', body, EXPIRED));
    });
  });

  it('SP-05 holding a guest’s cart key does not open that guest’s cart or wishlist to a signed-in shopper', () => {
    cy.gql(CLEAR, {}, { token: memberToken });
    cy.gql<{ storeAddToCart: { lines: Array<{ product_id: string }> } }>(ADD, { token: guest, id: product.id, variant: variant() }, { token: null })
      .its('storeAddToCart.lines')
      .then((lines: Array<{ product_id: string }>) => expect(lines.map((l) => l.product_id)).to.include(product.id));
    cy.gql<{ storeCart: { lines: unknown[] } }>(CART, { token: guest }, { token: memberToken }).its('storeCart.lines').should('deep.equal', []);
    cy.gql<{ storeWishlistIds: string[] }>(WISH, {}, { token: memberToken }).then(({ storeWishlistIds: mine }) => {
      cy.gql<{ storeToggleWishlist: string[] }>(TOGGLE, { token: guest, id: product.id }, { token: null })
        .its('storeToggleWishlist')
        .should('include', product.id);
      cy.gql<{ storeWishlistIds: string[] }>(WISH, { token: guest }, { token: memberToken })
        .its('storeWishlistIds')
        .should('deep.equal', mine);
    });
    cy.gql<{ storeCart: { lines: Array<{ product_id: string }> } }>(CART, { token: guest }, { token: null })
      .its('storeCart.lines')
      .then((lines: Array<{ product_id: string }>) => expect(lines.map((l) => l.product_id), 'the guest still has it').to.include(product.id));
  });

  it('SP-06 an address that is not the shopper’s cannot be deleted, made default or overwritten', () => {
    ADDRESS_CALLS.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [memberToken, { code: 'NOT_FOUND', message: 'Address not found' }],
        [null, SIGNED_OUT],
      ]);
    });
  });
});
