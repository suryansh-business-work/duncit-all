/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused, guestCartToken } from '../../../support/api-partners';
import { storeProduct, storeSettings, type StoreCard } from '../../../support/ui-websites';

/**
 * The pet store shopper's account (ecomm.duncit.com /account, /cart,
 * /wishlist, /account/addresses, /account/pet) — the main Duncit sign-in, not
 * Partner Brand. After sign-in the storefront calls storeMergeGuest, which
 * folds the guest cart (keeping the larger quantity per line) and the guest
 * wishlist into the account and drops the guest cart
 * (commerce/store/store.cart.service.ts `mergeGuest`). The address book is the
 * shared one (access/addressBook) and the pet profile is the account's
 * (updateMyPetProfile). Everything runs on the run account and a guest key of
 * its own; the cart, wishlist and addresses it adds are removed again. No
 * order is placed. Scenario map: Ecomm Store › Account (merge the guest cart,
 * addresses and pet profile).
 */

const ADD = `mutation E2eSaAdd($token: String, $id: ID!, $variant: String) {
  storeAddToCart(cart_token: $token, product_id: $id, variant_id: $variant, qty: 2) { lines { product_id quantity } }
}`;
const TOGGLE = `mutation E2eSaToggle($token: String, $id: ID!) { storeToggleWishlist(cart_token: $token, product_id: $id) }`;
const MERGE = `mutation E2eSaMerge($token: String) { storeMergeGuest(cart_token: $token) { lines { product_id quantity } } }`;
const CART = `query E2eSaCart($token: String) { storeCart(cart_token: $token) { lines { product_id quantity } } }`;
const CLEAR = `mutation E2eSaClear { storeClearCart { item_count } }`;
const WISH_IDS = `query E2eSaWishIds($token: String) { storeWishlistIds(cart_token: $token) }`;

const ADDRESSES = `query E2eSaAddresses { myAddresses { id is_default } }`;
const SAVE_ADDRESS = `mutation E2eSaSaveAddress($input: UserAddressInput!) { saveMyAddress(input: $input) { id is_default } }`;
const DEFAULT_ADDRESS = `mutation E2eSaDefault($id: ID!) { setDefaultMyAddress(id: $id) { id is_default } }`;
const DELETE_ADDRESS = `mutation E2eSaDelete($id: ID!) { deleteMyAddress(id: $id) }`;
const PET = `mutation E2eSaPet($input: PetProfileInput!) { updateMyPetProfile(input: $input) { id } }`;
const ME_PET = `query E2eSaMePet { me { pet_profile { name species breed age } } }`;

const HOME = { label: 'E2E store home', line1: '12 Residency Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560025' };
const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });

interface Line {
  product_id: string;
  quantity: number;
}
interface Address {
  id: string;
  is_default: boolean;
}

describe('API · Pet store account: the guest cart and wishlist follow the shopper in, and the account pages are theirs', { testIsolation: false }, () => {
  let memberToken = '';
  let product: StoreCard;

  const wishIds = (token: string | null, cartToken?: string) =>
    cy.gql<{ storeWishlistIds: string[] }>(WISH_IDS, { token: cartToken ?? null }, { token }).then((d) => d.storeWishlistIds);

  before(() => {
    storeSettings();
    signInRunMember().then((token) => {
      memberToken = token;
    });
    storeProduct(() => true, 'to put in a guest cart').then((card) => {
      product = card;
    });
  });

  after(() => {
    cy.gql(CLEAR, {}, { token: memberToken });
    wishIds(memberToken).then((ids) => {
      if (ids.includes(product.id)) cy.gql(TOGGLE, { id: product.id }, { token: memberToken });
    });
  });

  it('SA-01 signed out, the account pages and the merge ask for a sign-in', () => {
    expectEachRefused('myAddresses', ADDRESSES, {}, [[null, SIGNED_OUT]]);
    expectEachRefused('storeMergeGuest', MERGE, { token: guestCartToken('signed-out') }, [[null, SIGNED_OUT]]);
    expectEachRefused('updateMyPetProfile', PET, { input: { name: 'Bruno' } }, [[null, AUTH_REQUIRED]]);
  });

  it('SA-02 signing in folds the guest cart and wishlist into the account, and the guest cart is gone', () => {
    const guest = guestCartToken('merge');
    const variant = product.has_variants ? product.lead_variant_id : null;
    cy.gql(CLEAR, {}, { token: memberToken });
    wishIds(memberToken).then((ids) => {
      if (ids.includes(product.id)) cy.gql(TOGGLE, { id: product.id }, { token: memberToken });
    });
    cy.gql<{ storeAddToCart: { lines: Line[] } }>(ADD, { token: guest, id: product.id, variant }, { token: null }).then(({ storeAddToCart }) => {
      expect(storeAddToCart.lines.map((l) => l.product_id), 'the guest cart').to.include(product.id);
    });
    cy.gql<{ storeToggleWishlist: string[] }>(TOGGLE, { token: guest, id: product.id }, { token: null })
      .its('storeToggleWishlist')
      .should('include', product.id);
    cy.gql<{ storeMergeGuest: { lines: Line[] } }>(MERGE, { token: guest }, { token: memberToken }).then(({ storeMergeGuest }) => {
      const line = storeMergeGuest.lines.find((l) => l.product_id === product.id);
      expect(line, 'the guest line is now the account’s').to.exist;
      expect(line?.quantity, 'its quantity came with it').to.be.at.least(1);
    });
    cy.gql<{ storeCart: { lines: Line[] } }>(CART, {}, { token: memberToken })
      .its('storeCart.lines')
      .then((lines: Line[]) => expect(lines.map((l) => l.product_id)).to.include(product.id));
    wishIds(memberToken).should('include', product.id);
    cy.gql<{ storeCart: { lines: Line[] } }>(CART, { token: guest }, { token: null }).its('storeCart.lines').should('deep.equal', []);
  });

  it('SA-03 an address needs a street, city, state and pincode', () => {
    [
      [{ ...HOME, line1: ' ' }, bad('Address line 1 is required')],
      [{ ...HOME, city: '' }, bad('City is required')],
      [{ ...HOME, state: '' }, bad('State is required')],
      [{ ...HOME, pincode: '12' }, bad('Enter a valid pincode')],
    ].forEach(([input, refusal]) => {
      cy.gqlRaw(SAVE_ADDRESS, { input }, { token: memberToken }).then((body) => expectRefused('saveMyAddress', body, refusal as Refusal));
    });
  });

  it('SA-04 "Make default" moves the default, and deleted addresses stay deleted', () => {
    const save = (label: string) =>
      cy.gql<{ saveMyAddress: Address }>(SAVE_ADDRESS, { input: { ...HOME, label } }, { token: memberToken }).its('saveMyAddress');
    save('E2E store first').then((first: Address) => {
      save('E2E store second').then((second: Address) => {
        expect(second.is_default, 'a later address is not the default by itself').to.equal(false);
        cy.gql<{ setDefaultMyAddress: Address }>(DEFAULT_ADDRESS, { id: second.id }, { token: memberToken })
          .its('setDefaultMyAddress.is_default')
          .should('equal', true);
        cy.gql<{ myAddresses: Address[] }>(ADDRESSES, {}, { token: memberToken }).then(({ myAddresses }) => {
          expect(myAddresses.filter((a) => a.is_default).map((a) => a.id), 'exactly one default').to.deep.equal([second.id]);
        });
        [second.id, first.id].forEach((id) => {
          cy.gql<{ deleteMyAddress: boolean }>(DELETE_ADDRESS, { id }, { token: memberToken }).its('deleteMyAddress').should('equal', true);
        });
        cy.gql<{ myAddresses: Address[] }>(ADDRESSES, {}, { token: memberToken }).then(({ myAddresses }) => {
          const ids = myAddresses.map((a) => a.id);
          expect(ids, 'both are gone').not.to.include(first.id);
          expect(ids).not.to.include(second.id);
          if (myAddresses.length > 0) expect(myAddresses.filter((a) => a.is_default), 'one default remains').to.have.length(1);
        });
      });
    });
  });

  it('SA-05 the pet profile saves and reads back on the account', () => {
    const pet = { name: 'Bruno', species: 'Dog', breed: 'Indie', age: 3 };
    cy.gql(PET, { input: pet }, { token: memberToken });
    cy.gql<{ me: { pet_profile: typeof pet } }>(ME_PET, {}, { token: memberToken }).its('me.pet_profile').should('deep.equal', pet);
  });
});
