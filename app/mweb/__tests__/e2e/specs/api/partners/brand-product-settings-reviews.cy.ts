/// <reference types="cypress" />
import { revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused, productFlagOn, productRefusal } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Partner Brand › a product's settings (/ecomm-brand/:brandId/products/:productId/settings)
 * and the seller's reply on its reviews (…/view) — the server half; the
 * not-found pages are partners-app specs/ui/brand-products.cy.ts.
 *
 * venues/inventory/inventory.service.ts updateMyProductSettings reads the
 * caller's roles live (`requireEcommManager`), then refuses a low-stock
 * threshold that is not a whole number of zero or more, and only then finds
 * the listing by id AND submitter (`ownedListing`) — so a bad threshold is
 * refused before any listing is read, and another partner's listing answers
 * like a missing one. venues/productReview/productReview.service.ts reply
 * refuses an empty reply first, then a review that does not exist, then anyone
 * but the product's brand owner. Every operation sits behind the product flag,
 * which answers first while the shop is off.
 *
 * The run account owns no brand or listing, so nothing is ever saved: every
 * call is one of those refusals. Scenario map: Partners › Product Settings
 * ("Low-stock settings validation", "Settings for an unknown product"),
 * Partners › Product Details & Reviews ("Reply to a product review" — its
 * refusals, "View a product that does not exist").
 */

const SETTINGS = `mutation E2eProductSettings($id: ID!, $threshold: Int!) {
  updateMyProductSettings(product_doc_id: $id, low_stock_alert: $threshold, notify_low_stock: true) { id }
}`;
const REPLY = `mutation E2eReviewReply($id: ID!, $reply: String!) {
  replyToProductReview(review_id: $id, reply: $reply) { id }
}`;

const NOT_A_BRAND_PARTNER: Refusal = {
  code: 'FORBIDDEN',
  message: 'You must be an Ecomm Manager to manage product listings',
};
const LISTING_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Product listing not found' };
const WHOLE_NUMBER: Refusal = { code: 'BAD_USER_INPUT', message: 'Low-stock threshold must be a whole number' };

describe('API · A product’s settings and review replies are its brand partner’s', { testIsolation: false }, () => {
  let memberToken = '';
  let partnerToken = '';
  let flagOn = false;
  const as = (refusal: Refusal) => productRefusal(flagOn, refusal);

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

  // Before ECOMM_MANAGER is granted: the gate reads the account's roles live.
  it('PSR-01 product settings are refused signed out, and to a member who is not a brand partner', () => {
    expectEachRefused('updateMyProductSettings', SETTINGS, { id: NO_ID, threshold: 5 }, [
      [null, as(SIGNED_OUT)],
      [memberToken, as(NOT_A_BRAND_PARTNER)],
    ]);
  });

  it('PSR-02 a negative threshold is refused before any listing is read; a listing not theirs is not found', () => {
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
      expectEachRefused('updateMyProductSettings', SETTINGS, { id: NO_ID, threshold: -1 }, [[token, as(WHOLE_NUMBER)]]);
      expectEachRefused('updateMyProductSettings', SETTINGS, { id: NO_ID, threshold: 8 }, [[token, as(LISTING_NOT_FOUND)]]);
    });
  });

  it('PSR-03 a reply is refused signed out, refused empty, and finds no review that does not exist', () => {
    expectEachRefused('replyToProductReview', REPLY, { id: NO_ID, reply: 'Thank you!' }, [[null, as(SIGNED_OUT)]]);
    [memberToken, partnerToken].forEach((token) => {
      expectEachRefused('replyToProductReview', REPLY, { id: NO_ID, reply: '   ' }, [
        [token, as({ code: 'BAD_USER_INPUT', message: 'Reply cannot be empty' })],
      ]);
      expectEachRefused('replyToProductReview', REPLY, { id: NO_ID, reply: 'Thank you!' }, [
        [token, as({ code: 'NOT_FOUND', message: 'Review not found' })],
      ]);
    });
  });
});
