/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
  type Refusal,
} from '../../../support/access-steps';
import {
  createRunDraftBrand,
  deleteRunDraftBrand,
  expectEachRefused,
  FEATURE_DISABLED,
  productFlagOn,
  productRefusal,
  whenShopOn,
  type Caller,
} from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Catalogue deletion — a Partner Brand partner asks to delete a live brand or
 * product, and the Products team (PRODUCTS_TEAM = SUPER_ADMIN,
 * PRODUCTS_MANAGER: commerce/catalogDeletion/catalogDeletion.resolver.ts)
 * reviews it, follows the refunds (deletionRefundsTable, CANCEL_RW = + FINANCE)
 * and sets the notice window. Neither Products role is grantable, so the
 * review side is asserted as refusals to every role that is — a member, the
 * brand partner (ECOMM_MANAGER) and a city admin. The partner side runs on the
 * run account's own DRAFT brand (run-marked, never on sale, deleted at the
 * end): a draft is refused before any request is filed. Nothing is approved,
 * cancelled or refunded. Scenario map: Products › Catalogue Deletion (review,
 * refunds desk, deletion window), Deletion Requests (denied roles).
 */

const WINDOW = `query E2eCdWindow { catalogDeletionWindow { min_days max_days earliest latest } }`;
const MINE = `query E2eCdMine { myCatalogDeletionRequests { id } }`;
const REQUEST = `mutation E2eCdRequest($input: RequestCatalogDeletionInput!) { requestCatalogDeletion(input: $input) { id } }`;
const PREVIEW = `query E2eCdPreview($id: ID!) { catalogDeletionPreview(kind: BRAND, target_id: $id) { brand_name } }`;
const WITHDRAW = `mutation E2eCdWithdraw($id: ID!) { withdrawCatalogDeletion(id: $id) { id } }`;
const TEAM_CALLS = [
  ['catalogDeletionRequestsTable', `query E2eCdQueue { catalogDeletionRequestsTable(kind: BRAND, query: { page_size: 1 }) { total } }`],
  ['catalogDeletionRequest', `query E2eCdDetail { catalogDeletionRequest(id: "${NO_ID}") { request { id } } }`],
  ['reviewCatalogDeletion', `mutation E2eCdReview { reviewCatalogDeletion(id: "${NO_ID}", approve: true) { id } }`],
  ['updateCatalogDeletionWindow', `mutation E2eCdSetWindow { updateCatalogDeletionWindow(input: { min_days: 1, max_days: 2 }) { min_days } }`],
  ['deletionRefundsTable', `query E2eCdRefunds { deletionRefundsTable(query: { page_size: 1 }) { total } }`],
  ['retryProductOrderRefund', `mutation E2eCdRetryRefund { retryProductOrderRefund(id: "${NO_ID}") { id } }`],
] as const;

const BRAND_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Brand not found' };
const NEVER_ON_SALE: Refusal = { code: 'BAD_REQUEST', message: 'This brand never went on sale — delete it directly instead' };
const DAY_MS = 86_400_000;

interface Window {
  min_days: number;
  max_days: number;
  earliest: string;
  latest: string;
}

const brandRequest = (id: string) => ({
  input: { kind: 'BRAND', target_id: id, mode: 'WAIT_FOR_ORDERS', scheduled_for: '2099-01-01', reason: 'e2e' },
});

describe('API · Catalogue deletion: partners ask, only the Products team decides', { testIsolation: false }, () => {
  let memberToken = '';
  let partnerToken = '';
  let cityAdminToken = '';
  let flagOn = false;
  let brandId = '';
  let noticeWindow: Window | null = null;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    productFlagOn().then((on) => {
      flagOn = on;
      if (on) {
        createRunDraftBrand(memberToken, 'deletion').then((id) => {
          brandId = id;
        });
      }
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
    if (brandId) deleteRunDraftBrand(memberToken, brandId);
  });

  it('CD-01 the notice window is whole days inside 1–365, and its dates span exactly min..max days from today', () => {
    expectEachRefused('catalogDeletionWindow', WINDOW, {}, [[null, productRefusal(flagOn, SIGNED_OUT)]]);
    cy.gqlRaw(WINDOW, {}, { token: partnerToken }).then((body) =>
      whenShopOn(flagOn, 'catalogDeletionWindow', body, (b) => {
        expect(b.errors, 'catalogDeletionWindow errors').to.be.undefined;
        const w = b.data?.catalogDeletionWindow as Window;
        expect(w.min_days).to.be.within(1, 365);
        expect(w.max_days).to.be.within(w.min_days, 365);
        expect(w.earliest).to.match(/^\d{4}-\d{2}-\d{2}$/);
        expect(w.latest).to.match(/^\d{4}-\d{2}-\d{2}$/);
        const span = (Date.parse(`${w.latest}T00:00:00Z`) - Date.parse(`${w.earliest}T00:00:00Z`)) / DAY_MS;
        expect(span, 'latest − earliest = max − min').to.equal(w.max_days - w.min_days);
        const fromToday = (Date.parse(`${w.earliest}T00:00:00Z`) - Date.now()) / DAY_MS;
        // The app's calendar day can sit one day either side of UTC's.
        expect(fromToday, 'earliest is min_days after today').to.be.within(w.min_days - 2, w.min_days + 1);
        noticeWindow = w;
      }),
    );
  });

  it('CD-02 a partner who owns no live brand has no deletion requests; a member cannot ask', () => {
    cy.gqlRaw(MINE, {}, { token: partnerToken }).then((body) =>
      whenShopOn(flagOn, 'myCatalogDeletionRequests', body, (b) => {
        expect(b.errors).to.be.undefined;
        expect(b.data?.myCatalogDeletionRequests).to.deep.equal([]);
      }),
    );
    expectEachRefused('myCatalogDeletionRequests', MINE, {}, [
      [null, productRefusal(flagOn, SIGNED_OUT)],
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
  });

  it('CD-03 a partner can only ask about a brand they own, and a draft that never sold is refused before any request', () => {
    expectEachRefused('requestCatalogDeletion', REQUEST, brandRequest(NO_ID), [
      [partnerToken, productRefusal(flagOn, BRAND_NOT_FOUND)],
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
    expectEachRefused('catalogDeletionPreview', PREVIEW, { id: NO_ID }, [[partnerToken, productRefusal(flagOn, BRAND_NOT_FOUND)]]);
    if (!flagOn) return;
    expectEachRefused('requestCatalogDeletion', REQUEST, brandRequest(brandId), [[partnerToken, NEVER_ON_SALE]]);
    expectEachRefused('catalogDeletionPreview', PREVIEW, { id: brandId }, [[partnerToken, NEVER_ON_SALE]]);
    cy.gql<{ myCatalogDeletionRequests: unknown[] }>(MINE, {}, { token: partnerToken })
      .its('myCatalogDeletionRequests')
      .should('have.length', 0);
  });

  it('CD-04 a request that does not exist cannot be withdrawn', () => {
    expectEachRefused('withdrawCatalogDeletion', WITHDRAW, { id: NO_ID }, [
      [partnerToken, productRefusal(flagOn, { code: 'NOT_FOUND', message: 'Request not found' })],
    ]);
  });

  it('CD-05 the review queue, decisions, window, refunds desk and refund retry refuse everyone but the Products team', () => {
    TEAM_CALLS.forEach(([field, query]) => {
      const callers: Caller[] = [
        [null, productRefusal(flagOn, SIGNED_OUT)],
        [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
        [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
        [cityAdminToken, productRefusal(flagOn, ACCESS_DENIED)],
      ];
      expectEachRefused(field, query, {}, callers);
    });
  });

  it('CD-06 the refused window change left the notice window as it was', () => {
    if (!flagOn) {
      expectEachRefused('catalogDeletionWindow', WINDOW, {}, [[partnerToken, FEATURE_DISABLED]]);
      return;
    }
    const saved = noticeWindow;
    expect(saved, 'CD-01 read the window first').not.to.be.null;
    if (!saved) return;
    cy.gql<{ catalogDeletionWindow: Window }>(WINDOW, {}, { token: partnerToken }).then(({ catalogDeletionWindow }) => {
      expect(catalogDeletionWindow.min_days).to.equal(saved.min_days);
      expect(catalogDeletionWindow.max_days).to.equal(saved.max_days);
    });
  });
});
