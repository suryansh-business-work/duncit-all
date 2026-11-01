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
import { expectEachRefused, expectPage, productFlagOn, productRefusal, type Caller } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Partner Brand (partners-app.duncit.com/ecomm-brand — never the pet store)
 * order, return, deletion and integration ACTIONS, for a partner who owns no
 * brand. brand-studio-access.cy.ts reads the lists; this spec aims every action
 * the order, return, deletion and integration pages offer at ids nobody owns,
 * and at inputs each server check refuses before it writes:
 *
 * - orders (commerce/productOrder/productOrder.brand.ts): `ownedOrder` finds the
 *   order by id AND the caller's brands, so booking, tracking, a new address,
 *   a document and a cancel & refund answer "Order not found";
 *   myDeletionRefundsTable is scoped to the caller's brands (none → none).
 * - returns (commerce/podShopReturn): only staff or ECOMM_MANAGER act
 *   (`actorOf`); a rejection needs the buyer's reason before the return loads;
 *   `loadFor` answers "Return not found" for a return of no brand of theirs.
 * - deletion (commerce/catalogDeletion): ECOMM_MANAGER only; the preview, the
 *   request and the withdraw resolve the brand by id AND owner first. A brand
 *   is deleted outright only by deleteMyEcommBrand, which loads it by id AND
 *   owner too — aimed here only at ids no brand has, so no brand is touched.
 * - integrations (venues/ecommBrand/partnerIntegration.service.ts): the name is
 *   checked before anything is saved or any vendor is called; another
 *   partner's connection answers "Integration not found".
 *
 * Every Partner Brand operation sits behind the product flag, which answers
 * first while the shop is off. Nothing here charges, refunds, books a courier
 * or deletes a brand. Scenario map: Partners › Brand Orders, Brand Returns,
 * Brand Deletion, Brand Integrations (the refusal and validation rows).
 */

const ORDER_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Order not found' };
const RETURN_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Return not found' };
const BRAND_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Brand not found' };
const INTEGRATION_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Integration not found' };

const ADDRESS = {
  name: 'E2E Buyer',
  phone: '9876543210',
  line1: '1 Test Street',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
};

const ORDER_ACTIONS = [
  ['brandBookProductOrderShipment', `mutation E2eBrandBook($id: ID!) { brandBookProductOrderShipment(id: $id) { id } }`],
  ['brandRefreshProductOrderTracking', `mutation E2eBrandTrack($id: ID!) { brandRefreshProductOrderTracking(id: $id) { id } }`],
  [
    'brandUpdateProductOrderAddress',
    `mutation E2eBrandAddress($id: ID!, $address: OrderShippingAddressInput!) {
      brandUpdateProductOrderAddress(id: $id, address: $address) { id }
    }`,
  ],
  [
    'brandProductOrderShipmentFile',
    `mutation E2eBrandLabel($id: ID!) { brandProductOrderShipmentFile(ids: [$id], kind: LABEL) { filename } }`,
  ],
  ['brandCancelProductOrder', `mutation E2eBrandCancelRefund($id: ID!) { brandCancelProductOrder(id: $id, reason: "e2e") { id } }`],
] as const;

const REFUNDS = `query E2eBrandDeletionRefunds { myDeletionRefundsTable(query: { page_size: 1 }) { total } }`;

const RETURN_ACTIONS = [
  ['approvePodShopReturn', `mutation E2eReturnApprove($id: ID!) { approvePodShopReturn(id: $id) { id } }`],
  ['rejectPodShopReturn', `mutation E2eReturnReject($id: ID!) { rejectPodShopReturn(id: $id, note: "Not as described") { id } }`],
  ['retryPodShopReturnPickup', `mutation E2eReturnPickup($id: ID!) { retryPodShopReturnPickup(id: $id) { id } }`],
  ['markPodShopReturnReceived', `mutation E2eReturnReceived($id: ID!) { markPodShopReturnReceived(id: $id) { id } }`],
  ['refundPodShopReturn', `mutation E2eReturnRefund($id: ID!) { refundPodShopReturn(id: $id) { id } }`],
  ['retryPodShopReturnRefund', `mutation E2eReturnRetryRefund($id: ID!) { retryPodShopReturnRefund(id: $id) { id } }`],
] as const;
const REJECT_BLANK = `mutation E2eReturnRejectBlank($id: ID!) { rejectPodShopReturn(id: $id, note: "   ") { id } }`;

const PREVIEW = `query E2eDeletionPreview($kind: CatalogDeletionKind!, $id: ID!) {
  catalogDeletionPreview(kind: $kind, target_id: $id) { brand_name }
}`;
const REQUEST = `mutation E2eDeletionRequest($id: ID!, $day: String!) {
  requestCatalogDeletion(input: { kind: BRAND, target_id: $id, mode: WAIT_FOR_ORDERS, scheduled_for: $day }) { id }
}`;
const WITHDRAW = `mutation E2eDeletionWithdraw($id: ID!) { withdrawCatalogDeletion(id: $id) { id } }`;
const WINDOW = `query E2eDeletionWindow { catalogDeletionWindow { min_days max_days earliest latest } }`;
const DELETE_BRAND = `mutation E2eDeleteOwnBrand($id: ID!) { deleteMyEcommBrand(brand_doc_id: $id) }`;

const SAVE_INTEGRATION = `mutation E2eSaveConnection($label: String!) {
  savePartnerIntegration(provider: RAZORPAY, input: { label: $label, razorpay: { key_id: "rzp_test_e2e", key_secret: "e2e" } }) { id }
}`;
const RECHECK = `mutation E2eRecheckConnection($id: ID!) { recheckPartnerIntegration(id: $id) { id } }`;
const DELETE_INTEGRATION = `mutation E2eDeleteConnection($id: ID!) { deletePartnerIntegration(id: $id) }`;
const USE_INTEGRATION = `mutation E2eUseConnection($id: ID!) {
  useBrandIntegration(brand_doc_id: $id, provider: RAZORPAY, integration_id: $id) { connected }
}`;
const MINE = `query E2eMyConnections { myPartnerIntegrations { id } }`;

describe('API · Partner Brand actions reach only the partner’s own orders, returns and brands', { testIsolation: false }, () => {
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
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('BA-01 booking, tracking, a new address, a label and cancel & refund find no order the partner does not own', () => {
    ORDER_ACTIONS.forEach(([field, query]) => {
      const callers: Caller[] = [
        [null, as(SIGNED_OUT)],
        [memberToken, as(ORDER_NOT_FOUND)],
        [partnerToken, as(ORDER_NOT_FOUND)],
      ];
      expectEachRefused(field, query, { id: NO_ID, address: ADDRESS }, callers);
    });
  });

  it('BA-02 the deletion-refunds list is refused signed out and empty for a partner who owns no brand', () => {
    expectEachRefused('myDeletionRefundsTable', REFUNDS, {}, [[null, as(SIGNED_OUT)]]);
    if (!flagOn) return;
    cy.gqlRaw(REFUNDS, {}, { token: partnerToken }).then((body) => {
      expect(expectPage('myDeletionRefundsTable', body), 'refunds of a partner with no brand').to.equal(0);
    });
  });

  it('BA-03 return decisions are refused to a member and find no return of another brand', () => {
    RETURN_ACTIONS.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [null, as(SIGNED_OUT)],
        [memberToken, as(ACCESS_DENIED)],
        [partnerToken, as(RETURN_NOT_FOUND)],
      ]);
    });
  });

  it('BA-04 a rejection without the buyer’s reason is refused before any return is loaded', () => {
    expectEachRefused('rejectPodShopReturn', REJECT_BLANK, { id: NO_ID }, [
      [partnerToken, as({ code: 'BAD_REQUEST', message: 'Tell the buyer why the return is not accepted' })],
    ]);
  });

  it('BA-05 deletion requests are a brand partner’s, and reach no brand, product or request they do not own', () => {
    const day = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expectEachRefused('catalogDeletionPreview', PREVIEW, { kind: 'BRAND', id: NO_ID }, [
      [memberToken, as(ACCESS_DENIED)],
      [partnerToken, as(BRAND_NOT_FOUND)],
    ]);
    expectEachRefused('catalogDeletionPreview', PREVIEW, { kind: 'PRODUCT', id: NO_ID }, [
      [partnerToken, as({ code: 'NOT_FOUND', message: 'Product not found' })],
    ]);
    expectEachRefused('requestCatalogDeletion', REQUEST, { id: NO_ID, day }, [
      [memberToken, as(ACCESS_DENIED)],
      [partnerToken, as(BRAND_NOT_FOUND)],
    ]);
    expectEachRefused('withdrawCatalogDeletion', WITHDRAW, { id: NO_ID }, [
      [memberToken, as(ACCESS_DENIED)],
      [partnerToken, as({ code: 'NOT_FOUND', message: 'Request not found' })],
    ]);
  });

  it('BA-06 the deletion window is a valid range of days, and a brand is deleted only by its owner', () => {
    if (flagOn) {
      cy.gql<{ catalogDeletionWindow: { min_days: number; max_days: number; earliest: string; latest: string } }>(
        WINDOW,
        {},
        { token: partnerToken },
      ).then(({ catalogDeletionWindow: range }) => {
        expect(range.min_days, 'the shortest notice').to.be.at.least(0).and.at.most(range.max_days);
        expect(range.earliest, 'first pickable day').to.match(/^\d{4}-\d{2}-\d{2}$/);
        expect(range.latest, 'last pickable day').to.match(/^\d{4}-\d{2}-\d{2}$/);
        expect(range.earliest <= range.latest, 'the window runs forwards').to.equal(true);
      });
    }
    expectEachRefused('deleteMyEcommBrand', DELETE_BRAND, { id: NO_ID }, [
      [null, as(AUTH_REQUIRED)],
      [partnerToken, as(BRAND_NOT_FOUND)],
    ]);
    expectEachRefused('deleteMyEcommBrand', DELETE_BRAND, { id: 'not-a-brand' }, [
      [partnerToken, as({ code: 'BAD_USER_INPUT', message: 'Invalid brand' })],
    ]);
  });

  it('BA-07 a connection needs a name of at most 60 characters, and nothing is saved when it has none', () => {
    const bad = (message: string) => as({ code: 'BAD_USER_INPUT', message });
    expectEachRefused('savePartnerIntegration', SAVE_INTEGRATION, { label: '  ' }, [
      [null, as(AUTH_REQUIRED)],
      [partnerToken, bad('Give this connection a name')],
    ]);
    expectEachRefused('savePartnerIntegration', SAVE_INTEGRATION, { label: 'x'.repeat(61) }, [
      [partnerToken, bad('Keep the name under 60 characters')],
    ]);
    if (flagOn) {
      cy.gql<{ myPartnerIntegrations: unknown[] }>(MINE, {}, { token: partnerToken }).then((data) => {
        expect(data.myPartnerIntegrations, 'no connection was saved').to.deep.equal([]);
      });
    }
  });

  it('BA-08 another partner’s connection cannot be re-tested, deleted or linked to a brand', () => {
    expectEachRefused('recheckPartnerIntegration', RECHECK, { id: NO_ID }, [[partnerToken, as(INTEGRATION_NOT_FOUND)]]);
    expectEachRefused('deletePartnerIntegration', DELETE_INTEGRATION, { id: NO_ID }, [
      [null, as(AUTH_REQUIRED)],
      [partnerToken, as(INTEGRATION_NOT_FOUND)],
    ]);
    expectEachRefused('deletePartnerIntegration', DELETE_INTEGRATION, { id: 'abc' }, [
      [partnerToken, as({ code: 'BAD_USER_INPUT', message: 'Invalid integration' })],
    ]);
    expectEachRefused('useBrandIntegration', USE_INTEGRATION, { id: NO_ID }, [[partnerToken, as(BRAND_NOT_FOUND)]]);
  });
});
