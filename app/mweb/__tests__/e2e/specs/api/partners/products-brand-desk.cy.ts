/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  expectRefused,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  type Refusal,
} from '../../../support/access-steps';
import {
  createRunDraftBrand,
  deleteRunDraftBrand,
  expectEachRefused,
  expectPage,
  FEATURE_DISABLED,
  productFlagOn,
  productRefusal,
  whenShopOn,
} from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The Products console's brand desk — Brands Review (/ecomm/brands) and
 * Catalog › Brands (/catalog/brands) — on Partner Brand sellers, never the
 * pet store. The review resolvers are requireRole(BRAND_REVIEW = SUPER_ADMIN,
 * CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER, PRODUCTS_MANAGER) and the
 * commission adds FINANCE_MANAGER (venues/ecommBrand/ecommBrand.resolver.ts);
 * PRODUCTS_MANAGER is not grantable to a run account, so ONBOARDING_MANAGER —
 * the same list — stands in for the reviewer. The only brand acted on is the
 * run account's own DRAFT (named with the run marker, never submitted, so never
 * on sale), deleted at the end. Approval is asserted as the refusal an
 * unfinished brand gets (`assertReadyForReview`), so nothing goes live and no
 * role is granted. Scenario map: Products › Brands Review (denied roles,
 * approve), Catalog Brands (denied roles, set commission).
 */

const QUEUE = `query E2eBdQueue { ecommBrandsTable(query: { page_size: 1 }) { total } }`;
const BRAND = `query E2eBdBrand($id: ID!) { ecommBrand(brand_doc_id: $id) { id status brand_name product_commission_pct } }`;
const APPROVE = `mutation E2eBdApprove($id: ID!) { approveEcommBrand(brand_doc_id: $id, tags: ["e2e"]) { id status } }`;
const COMMISSION = `mutation E2eBdCommission($id: ID!, $pct: Float!) {
  setBrandCommission(brand_doc_id: $id, product_commission_pct: $pct) { id product_commission_pct }
}`;
const ACTIVE = `mutation E2eBdActive($id: ID!) { setEcommBrandActive(brand_doc_id: $id, active: false) { id is_active } }`;

const COMMISSION_RANGE: Refusal = { code: 'BAD_USER_INPUT', message: 'product_commission_pct must be between 0 and 100' };
const BRAND_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Brand not found' };

interface BrandRow {
  id: string;
  status: string;
  brand_name: string;
  product_commission_pct: number;
}

describe('API · Products brand desk: reviewers decide brands, a brand owner never decides their own', { testIsolation: false }, () => {
  let memberToken = '';
  let reviewerToken = '';
  let partnerToken = '';
  let flagOn = false;
  let brandId = '';

  /** The run's draft as the reviewer reads it. */
  const readBrand = (): Cypress.Chainable<BrandRow> =>
    cy.gql<{ ecommBrand: BrandRow }>(BRAND, { id: brandId }, { token: reviewerToken }).then((data) => data.ecommBrand);

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    productFlagOn().then((on) => {
      flagOn = on;
      if (on) {
        createRunDraftBrand(memberToken, 'brand-desk').then((id) => {
          brandId = id;
        });
      }
    });
    signInRunAs(['ONBOARDING_MANAGER']).then((token) => {
      reviewerToken = token;
    });
    revokeRunRoles(['ONBOARDING_MANAGER']);
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
    if (brandId) deleteRunDraftBrand(memberToken, brandId);
  });

  it('BD-01 the review queue is refused to a member and to a brand owner, and read by a reviewer', () => {
    expectEachRefused('ecommBrandsTable', QUEUE, {}, [
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
    cy.gqlRaw(QUEUE, {}, { token: reviewerToken }).then((body) =>
      whenShopOn(flagOn, 'ecommBrandsTable', body, (b) => expectPage('ecommBrandsTable', b)),
    );
  });

  it('BD-02 a brand owner cannot approve, re-price or switch off their own brand', () => {
    const id = brandId || NO_ID;
    expectEachRefused('approveEcommBrand', APPROVE, { id }, [[partnerToken, productRefusal(flagOn, ACCESS_DENIED)]]);
    expectEachRefused('setBrandCommission', COMMISSION, { id, pct: 1 }, [[partnerToken, productRefusal(flagOn, ACCESS_DENIED)]]);
    expectEachRefused('setEcommBrandActive', ACTIVE, { id }, [[partnerToken, productRefusal(flagOn, ACCESS_DENIED)]]);
    if (flagOn) {
      readBrand().then((brand) => {
        expect(brand.status, 'the brand is still the owner’s draft').to.equal('DRAFT');
        expect(brand.product_commission_pct, 'the owner did not set their own commission').not.to.equal(1);
      });
    }
  });

  it('BD-03 the reviewer opens the run’s draft at its real status and name', () => {
    if (!flagOn) {
      expectEachRefused('ecommBrand', BRAND, { id: NO_ID }, [[reviewerToken, FEATURE_DISABLED]]);
      return;
    }
    readBrand().then((brand) => {
      expect(brand.id).to.equal(brandId);
      expect(brand.status).to.equal('DRAFT');
      expect(brand.brand_name, 'the run-marked name').to.contain('brand-desk');
    });
  });

  it('BD-04 approving a brand that has not finished its steps is refused, naming what is missing', () => {
    if (!flagOn) {
      expectEachRefused('approveEcommBrand', APPROVE, { id: NO_ID }, [[reviewerToken, FEATURE_DISABLED]]);
      return;
    }
    cy.gqlRaw(APPROVE, { id: brandId }, { token: reviewerToken }).then((body) => {
      const [error] = body.errors ?? [];
      expect(error?.extensions?.code, 'refusal code').to.equal('BAD_REQUEST');
      expect(error?.message, 'refusal message').to.match(/^This brand cannot be approved yet — finish: .+/);
      expect(body.data?.approveEcommBrand ?? null, 'nothing approved').to.be.null;
    });
    readBrand().its('status').should('equal', 'DRAFT');
  });

  it('BD-05 an unknown brand reads as nothing and cannot be approved', () => {
    cy.gqlRaw(BRAND, { id: NO_ID }, { token: reviewerToken }).then((body) =>
      whenShopOn(flagOn, 'ecommBrand', body, (b) => {
        expect(b.errors, 'ecommBrand errors').to.be.undefined;
        expect(b.data?.ecommBrand, 'no such brand').to.be.null;
      }),
    );
    expectEachRefused('approveEcommBrand', APPROVE, { id: NO_ID }, [[reviewerToken, productRefusal(flagOn, BRAND_NOT_FOUND)]]);
  });

  it('BD-06 a commission outside 0–100 is refused and a valid one is saved and read back', () => {
    const id = brandId || NO_ID;
    [150, -1].forEach((pct) => {
      expectEachRefused('setBrandCommission', COMMISSION, { id, pct }, [[reviewerToken, productRefusal(flagOn, COMMISSION_RANGE)]]);
    });
    if (!flagOn) return;
    cy.gql<{ setBrandCommission: { product_commission_pct: number } }>(COMMISSION, { id, pct: 12.5 }, { token: reviewerToken })
      .its('setBrandCommission.product_commission_pct')
      .should('equal', 12.5);
    readBrand().its('product_commission_pct').should('equal', 12.5);
  });

  it('BD-07 a brand owner’s re-price attempt leaves the reviewer’s commission in place', () => {
    cy.gqlRaw(COMMISSION, { id: brandId || NO_ID, pct: 50 }, { token: partnerToken }).then((body) =>
      expectRefused('setBrandCommission', body, productRefusal(flagOn, ACCESS_DENIED)),
    );
    if (flagOn) readBrand().its('product_commission_pct').should('equal', 12.5);
  });
});
