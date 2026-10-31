/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
  type Refusal,
} from '../../../support/access-steps';
import { expectEachRefused, expectPage, productFlagOn, productRefusal, whenShopOn } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The Products console's own catalogue: the dashboard KPIs (/), the product
 * editor (/inventory/new, /inventory/:id/edit) and Products Reviews
 * (/ecomm/product-requests). All are requireRole(ADMIN_RW = SUPER_ADMIN,
 * CITY_ADMIN, PRODUCTS_MANAGER: venues/inventory/inventory.roles.ts) behind
 * the product flag; a city admin is the grantable one. The editor's server
 * checks are asserted on CREATE inputs that each break one rule
 * (`validateInput`, the pickup and brand checks, the SKU uniqueness check) —
 * every one refuses before a product is written, so no catalogue row is made.
 * Scenario map: Products › Dashboard (read), Product Editor (create
 * validation, SKU generator, duplicate SKU, unknown product), Products Reviews
 * (approve/deny guard, denied roles).
 */

const DASHBOARD = [
  ['inventoryProducts', `query E2eDbProducts { inventoryProducts { inventory_count reserved_count requested_count available_count selling_price low_stock_alert } }`],
  ['productOrders', `query E2eDbOrders { productOrders(filter: {}) { total fulfilment_status } }`],
  ['marketplaceBrands', `query E2eDbBrands { marketplaceBrands { approved_product_count } }`],
] as const;
const SKU = `mutation E2ePeSku { generateInventorySku }`;
const CREATE = `mutation E2ePeCreate($input: InventoryProductInput!) { createInventoryProduct(input: $input) { id } }`;
const PRODUCTS_PAGE = `query E2ePeRows { inventoryProductsTable(query: { page_size: 1 }) { rows { sku } } }`;
const DUNCIT_PICKUPS = `query E2ePePickups { brandPickupLocations(owner_kind: DUNCIT) { id is_active } }`;
const PRODUCT = `query E2ePeProduct($id: ID!) { inventoryProduct(product_doc_id: $id) { id } }`;
const ON_UNKNOWN = [
  ['updateInventoryProduct', `mutation E2ePeUpdate($id: ID!) { updateInventoryProduct(product_doc_id: $id, input: { product_name: "e2e" }) { id } }`],
  ['archiveInventoryProduct', `mutation E2ePeArchive($id: ID!) { archiveInventoryProduct(product_doc_id: $id) { id } }`],
  ['restoreInventoryProduct', `mutation E2ePeRestore($id: ID!) { restoreInventoryProduct(product_doc_id: $id) { id } }`],
  ['duplicateInventoryProduct', `mutation E2ePeDuplicate($id: ID!) { duplicateInventoryProduct(product_doc_id: $id) { id } }`],
  ['setInventoryProductActive', `mutation E2ePeActive($id: ID!) { setInventoryProductActive(product_doc_id: $id, active: true) { id } }`],
  ['permanentlyDeleteInventoryProduct', `mutation E2ePeDelete($id: ID!) { permanentlyDeleteInventoryProduct(product_doc_id: $id) }`],
] as const;
const LISTINGS = `query E2eRvListings { productListingRequestsTable(query: { page_size: 1 }) { total } }`;
const REVIEW = `mutation E2eRvReview($id: ID!, $status: ProductListingReviewStatus!) {
  reviewProductListing(product_doc_id: $id, status: $status, notes: "e2e", commission_pct: 12) { id }
}`;

const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });
const BASE = { product_name: 'E2E refused product', unit_cost: 10 };

interface StockRow {
  inventory_count: number;
  reserved_count: number;
  requested_count: number;
  available_count: number;
}

describe('API · Products catalogue: the editor refuses broken products before saving, and only catalogue staff edit', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';
  let partnerToken = '';
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

  it('DB-01 the dashboard’s three sources are refused to a signed-out caller, a member and a brand partner', () => {
    DASHBOARD.forEach(([field, query]) => {
      expectEachRefused(field, query, {}, [
        [null, productRefusal(flagOn, SIGNED_OUT)],
        [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
        [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
      ]);
    });
  });

  it('DB-02 the KPI inputs are sound: available stock is stock less requested and reserved, counts are whole', () => {
    const [[productsField, productsQuery], [ordersField, ordersQuery], [brandsField, brandsQuery]] = DASHBOARD;
    cy.gqlRaw(productsQuery, {}, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, productsField, body, (b) => {
        expect(b.errors).to.be.undefined;
        (b.data?.inventoryProducts as StockRow[]).forEach((p) => {
          expect(p.available_count, 'available').to.equal(Math.max(0, p.inventory_count - p.requested_count - p.reserved_count));
        });
      }),
    );
    cy.gqlRaw(ordersQuery, {}, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, ordersField, body, (b) => {
        expect(b.errors).to.be.undefined;
        (b.data?.productOrders as Array<{ total: number; fulfilment_status: string }>).forEach((o) => {
          expect(o.total, 'order total').to.be.a('number').and.at.least(0);
          expect(o.fulfilment_status, 'order status').to.be.a('string').and.not.be.empty;
        });
      }),
    );
    cy.gqlRaw(brandsQuery, {}, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, brandsField, body, (b) => {
        expect(b.errors).to.be.undefined;
        (b.data?.marketplaceBrands as Array<{ approved_product_count: number }>).forEach((brand) => {
          expect(Number.isInteger(brand.approved_product_count) && brand.approved_product_count >= 0, 'approved products').to.equal(true);
        });
      }),
    );
  });

  it('PE-01 "Generate new SKU" answers a fresh 8-character code from the unambiguous alphabet', () => {
    expectEachRefused('generateInventorySku', SKU, {}, [[partnerToken, productRefusal(flagOn, ACCESS_DENIED)]]);
    if (!flagOn) return;
    cy.gql<{ generateInventorySku: string }>(SKU, {}, { token: cityAdminToken }).then(({ generateInventorySku: first }) => {
      expect(first).to.match(/^[A-HJ-NP-Z2-9]{8}$/);
      cy.gql<{ generateInventorySku: string }>(SKU, {}, { token: cityAdminToken })
        .its('generateInventorySku')
        .should('match', /^[A-HJ-NP-Z2-9]{8}$/)
        .and('not.equal', first);
    });
  });

  it('PE-02 a product breaking one rule is refused with that rule, before anything is saved', () => {
    const cases: Array<[Record<string, unknown>, Refusal]> = [
      [{ unit_cost: -1 }, bad('Product cost cannot be negative')],
      [{ inventory_count: -5 }, bad('Inventory count cannot be negative')],
      [{ min_order_qty: 10, max_order_qty: 5 }, bad('Min order qty cannot exceed max order qty')],
      [{ hsn_code: '12' }, bad('HSN code is 4 to 8 digits (pet food 2309, toys 9503)')],
      [{}, bad('A pickup address is required')],
      [{ pickup_location_id: NO_ID }, bad('Select a valid Duncit pickup address')],
      [{ brand_id: NO_ID }, { code: 'NOT_FOUND', message: 'Brand not found' }],
    ];
    cases.forEach(([change, refusal]) => {
      expectEachRefused('createInventoryProduct', CREATE, { input: { ...BASE, ...change } }, [
        [cityAdminToken, productRefusal(flagOn, refusal)],
      ]);
    });
    expectEachRefused('createInventoryProduct', CREATE, { input: BASE }, [
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
  });

  it('PE-03 a SKU another product already uses is refused on create', function () {
    if (!flagOn) {
      expectEachRefused('createInventoryProduct', CREATE, { input: BASE }, [[cityAdminToken, productRefusal(false, ACCESS_DENIED)]]);
      return;
    }
    cy.gql<{ inventoryProductsTable: { rows: Array<{ sku: string }> } }>(PRODUCTS_PAGE, {}, { token: cityAdminToken }).then(
      ({ inventoryProductsTable }) => {
        cy.gql<{ brandPickupLocations: Array<{ id: string; is_active: boolean }> }>(DUNCIT_PICKUPS, {}, { token: cityAdminToken }).then(
          ({ brandPickupLocations }) => {
            const sku = inventoryProductsTable.rows[0]?.sku;
            const pickup = brandPickupLocations.find((p) => p.is_active);
            // Staging without a catalogue product or a live Duncit pickup cannot stage the clash.
            if (!sku || !pickup) this.skip();
            const input = { ...BASE, sku, pickup_location_id: pickup?.id };
            expectEachRefused('createInventoryProduct', CREATE, { input }, [
              [cityAdminToken, { code: 'CONFLICT', message: 'Product SKU already exists' }],
            ]);
          },
        );
      },
    );
  });

  it('PE-04 a product id no product has opens nothing and cannot be edited, archived, restored, copied or deleted', () => {
    cy.gqlRaw(PRODUCT, { id: NO_ID }, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, 'inventoryProduct', body, (b) => {
        expect(b.errors).to.be.undefined;
        expect(b.data?.inventoryProduct).to.be.null;
      }),
    );
    ON_UNKNOWN.forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [
        [cityAdminToken, productRefusal(flagOn, { code: 'NOT_FOUND', message: 'Product not found' })],
      ]);
    });
  });

  it('RV-01 Products Reviews is read by catalogue staff and refused to a brand partner and a member', () => {
    cy.gqlRaw(LISTINGS, {}, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, 'productListingRequestsTable', body, (b) => expectPage('productListingRequestsTable', b)),
    );
    expectEachRefused('productListingRequestsTable', LISTINGS, {}, [
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
    expectEachRefused('reviewProductListing', REVIEW, { id: NO_ID, status: 'APPROVED' }, [
      [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
  });

  it('RV-02 a listing decision is only Approve or Deny, and only on a listing that exists', () => {
    expectEachRefused('reviewProductListing', REVIEW, { id: NO_ID, status: 'PENDING' }, [
      [cityAdminToken, productRefusal(flagOn, bad('Review decision must be APPROVED or DENIED'))],
    ]);
    ['APPROVED', 'DENIED'].forEach((status) => {
      expectEachRefused('reviewProductListing', REVIEW, { id: NO_ID, status }, [
        [cityAdminToken, productRefusal(flagOn, { code: 'NOT_FOUND', message: 'Product listing request not found' })],
      ]);
    });
  });
});
