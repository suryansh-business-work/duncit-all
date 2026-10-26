/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
  type Refusal,
} from '../../../support/access-steps';
import { expectEachRefused, productFlagOn, productRefusal } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Brand products (partners-app /ecomm-brand/:brandId/products — Partner Brand,
 * not the pet store). Listing a product needs ECOMM_MANAGER, read from the
 * account's roles rather than the token (venues/inventory/inventory.service.ts
 * `requireEcommManager`), and a listing is found by id AND its submitter
 * (`ownedListing`), so another brand's product answers exactly like a missing
 * one. The catalogue itself is the Products team's (`ADMIN_RW`). Everything
 * here sits behind the product flag, which answers first while the shop is off.
 * The member checks run before ECOMM_MANAGER is granted, because the gate
 * reads the account's roles live. Scenario map: Partners › Brand products.
 */

const DELETE = `mutation E2eDeleteMyListing($id: ID!) { deleteMyProductListing(product_doc_id: $id) }`;
const PAUSE = `mutation E2ePauseMyListing($id: ID!) { setMyProductListingActive(product_doc_id: $id, active: false) { id } }`;
const QUANTITY = `mutation E2eListingQuantity($id: ID!) {
  updateMyProductListingQuantity(product_doc_id: $id, inventory_count: 1) { id }
}`;
const ANALYTICS = `query E2eListingAnalytics($id: ID!) { myProductAnalytics(product_doc_id: $id) { __typename } }`;
const CATALOGUE = `query E2eCatalogueTable { inventoryProductsTable(query: { page_size: 1 }) { total } }`;

const LISTINGS = [
  ['deleteMyProductListing', DELETE],
  ['setMyProductListingActive', PAUSE],
  ['updateMyProductListingQuantity', QUANTITY],
  ['myProductAnalytics', ANALYTICS],
] as const;
const NOT_A_BRAND_PARTNER: Refusal = {
  code: 'FORBIDDEN',
  message: 'You must be an Ecomm Manager to manage product listings',
};
const LISTING_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Product listing not found' };

describe('API · A brand partner manages only their own product listings', { testIsolation: false }, () => {
  let memberToken = '';
  let flagOn = false;
  let partnerToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    productFlagOn().then((on) => {
      flagOn = on;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('BP-01 listing operations are refused signed out, and to a member who is not a brand partner', () => {
    LISTINGS.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [null, productRefusal(flagOn, SIGNED_OUT)],
        [memberToken, productRefusal(flagOn, NOT_A_BRAND_PARTNER)],
      ]);
    });
  });

  it('BP-02 a brand partner cannot touch a listing they did not submit', () => {
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
      LISTINGS.forEach(([field, query]) => {
        expectEachRefused(field, query, { id: NO_ID }, [[token, productRefusal(flagOn, LISTING_NOT_FOUND)]]);
      });
    });
  });

  it('BP-03 a brand partner is refused the Duncit catalogue', () => {
    expectEachRefused('inventoryProductsTable', CATALOGUE, {}, [[partnerToken, productRefusal(flagOn, ACCESS_DENIED)]]);
  });
});
