/**
 * Unit cover for the DUNCIT-catalogue half of the inventory service: the read
 * scopes, the warehouse guard on create/update, the stock-movement ledger, the
 * pod availability roll-up and the day-bucketed analytics. Models are faked so
 * each assertion is about a rule or a query shape, not about Mongo.
 */
jest.mock('../../inventory.model', () => ({
  InventoryProductModel: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock('../../inventoryActivityLog.model', () => ({
  InventoryActivityLogModel: { create: jest.fn(), find: jest.fn() },
}));
jest.mock('../../inventoryStockMovement.model', () => ({
  InventoryStockMovementModel: { create: jest.fn(), find: jest.fn() },
}));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('@modules/venues/ecommBrand/ecommBrand.model', () => ({
  EcommBrandModel: { findById: jest.fn(), find: jest.fn() },
}));
jest.mock('@modules/venues/brandPickupLocation/brandPickupLocation.model', () => ({
  BrandPickupLocationModel: { findById: jest.fn() },
}));
jest.mock('@modules/pods/pod/pod.model', () => ({
  PodModel: { find: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock('@modules/pods/club/club.model', () => ({ ClubModel: { find: jest.fn() } }));
jest.mock('@modules/commerce/productOrder/productOrder.model', () => ({
  ProductOrderModel: { find: jest.fn() },
}));
jest.mock('@modules/moderation/moderation.service', () => ({
  moderationService: { assertProductCleanOrThrow: jest.fn() },
}));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));
jest.mock('@observability/log', () => ({
  logs: { server: { warn: jest.fn(), error: jest.fn() } },
}));

import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { inventoryService } from '../../inventory.service';
import { InventoryProductModel } from '../../inventory.model';
import { InventoryActivityLogModel } from '../../inventoryActivityLog.model';
import { InventoryStockMovementModel } from '../../inventoryStockMovement.model';

const productModel = InventoryProductModel as unknown as Record<string, jest.Mock>;
const activityModel = InventoryActivityLogModel as unknown as Record<string, jest.Mock>;
const movementModel = InventoryStockMovementModel as unknown as Record<string, jest.Mock>;
const brandModel = EcommBrandModel as unknown as Record<string, jest.Mock>;
const warehouseModel = BrandPickupLocationModel as unknown as Record<string, jest.Mock>;
const podModel = PodModel as unknown as Record<string, jest.Mock>;
const clubModel = ClubModel as unknown as Record<string, jest.Mock>;

const BRAND_ID = '65c000000000000000000001';
const WAREHOUSE_ID = '65c000000000000000000005';
const PRODUCT_ID = '65c000000000000000000009';
const VARIANT_ID = '65c00000000000000000000a';
const ADMIN = { id: 'u-admin-1', email: 'ops@duncit.com' } as unknown as AuthUser;

/** Chainable query stub: every terminal step resolves to `result`. */
const query = (result: unknown) => {
  const q: Record<string, unknown> = {};
  q.sort = jest.fn(() => q);
  q.select = jest.fn(() => q);
  q.skip = jest.fn(() => q);
  q.limit = jest.fn(() => Promise.resolve(result));
  q.lean = jest.fn(() => Promise.resolve(result));
  q.then = (onOk: (v: unknown) => unknown, onErr: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onOk, onErr);
  return q;
};

/** A hydrated catalogue product as the service sees it after a find. */
const productDoc = (over: Record<string, unknown> = {}) => {
  const doc: Record<string, any> = {
    _id: PRODUCT_ID,
    product_name: 'Duncit Cap',
    sku: 'CAP00001',
    ownership: 'DUNCIT',
    inventory_count: 10,
    reserved_count: 0,
    damaged_count: 0,
    requested_count: 0,
    status: 'ACTIVE',
    is_active: true,
    variants: [],
    options: [],
    categories: [],
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    ...over,
  };
  doc.save = jest.fn().mockResolvedValue(undefined);
  doc.toObject = jest.fn(() => ({ ...doc }));
  return doc;
};

/** Let assertDuncitWarehouse pass for the next call. */
const withDuncitWarehouse = () =>
  warehouseModel.findById.mockReturnValue(query({ owner_kind: 'DUNCIT' }));

beforeEach(() => {
  activityModel.create.mockResolvedValue({});
  movementModel.create.mockResolvedValue({});
  productModel.exists.mockResolvedValue(null);
  productModel.countDocuments.mockResolvedValue(0);
  withDuncitWarehouse();
});

describe('inventoryService.list', () => {
  it('builds an escaped, case-insensitive search across name, sku, tags and brand', async () => {
    productModel.find.mockReturnValue(query([productDoc()]));

    const rows = await inventoryService.list({ search: 'cap (new)', activeOnly: true, status: 'ACTIVE', ownership: 'DUNCIT' });

    const filter = productModel.find.mock.calls[0][0];
    expect(filter).toMatchObject({ is_active: true, status: 'ACTIVE', ownership: 'DUNCIT' });
    expect(filter.$or.map((clause: Record<string, RegExp>) => Object.keys(clause)[0])).toEqual([
      'product_name',
      'sku',
      'tags',
      'brand_name',
    ]);
    // The regex metacharacters in the search term are escaped, not interpreted.
    expect(filter.$or[0].product_name.source).toBe(String.raw`cap \(new\)`);
    expect(filter.$or[0].product_name.flags).toBe('i');
    expect(rows[0]).toMatchObject({ id: PRODUCT_ID, product_name: 'Duncit Cap' });
  });

  it('queries everything when no filter is supplied', async () => {
    productModel.find.mockReturnValue(query([]));
    await expect(inventoryService.list()).resolves.toEqual([]);
    expect(productModel.find).toHaveBeenCalledWith({});
  });
});

describe('inventoryService.table', () => {
  it('pages the catalogue and reports the total back', async () => {
    productModel.find.mockReturnValue(query([productDoc()]));
    productModel.countDocuments.mockResolvedValue(7);

    const page = await inventoryService.table({ page: 2, page_size: 1 });

    expect(page).toMatchObject({ total: 7, page: 2, page_size: 1 });
    expect(page.rows[0].sku).toBe('CAP00001');
  });
});

describe('inventoryService.listMarketplaceBrandProducts', () => {
  it.each([
    ['an unparseable brand id', 'not-an-oid', null],
    ['a brand that does not exist', BRAND_ID, null],
    ['a deactivated brand', BRAND_ID, { is_active: false, status: 'APPROVED' }],
    ['a brand that is not approved yet', BRAND_ID, { is_active: true, status: 'PENDING' }],
  ])('returns nothing for %s', async (_case, brandId, brand) => {
    brandModel.findById.mockReturnValue(query(brand));
    await expect(inventoryService.listMarketplaceBrandProducts(brandId)).resolves.toEqual([]);
    expect(productModel.find).not.toHaveBeenCalled();
  });

  it('lists only the approved BRAND-owned products of an approved, active brand', async () => {
    brandModel.findById.mockReturnValue(query({ is_active: true, status: 'APPROVED' }));
    productModel.find.mockReturnValue(query([productDoc({ ownership: 'BRAND' })]));

    const rows = await inventoryService.listMarketplaceBrandProducts(BRAND_ID);

    expect(productModel.find).toHaveBeenCalledWith({
      brand_id: new Types.ObjectId(BRAND_ID),
      ownership: 'BRAND',
      listing_review_status: 'APPROVED',
    });
    expect(rows).toHaveLength(1);
  });
});

describe('inventoryService.marketplaceBrandProductsTable', () => {
  it('scopes the page to the brand when it is approved and active', async () => {
    brandModel.findById.mockReturnValue(query({ is_active: true, status: 'APPROVED' }));
    productModel.find.mockReturnValue(query([]));

    await inventoryService.marketplaceBrandProductsTable(BRAND_ID);

    expect(productModel.find.mock.calls[0][0]).toMatchObject({
      brand_id: new Types.ObjectId(BRAND_ID),
      ownership: 'BRAND',
      listing_review_status: 'APPROVED',
    });
  });

  it.each([
    ['an unparseable brand id', 'not-an-oid', null],
    ['a deactivated brand', BRAND_ID, { is_active: false, status: 'APPROVED' }],
  ])('serves a match-nothing page for %s', async (_case, brandId, brand) => {
    brandModel.findById.mockReturnValue(query(brand));
    productModel.find.mockReturnValue(query([]));

    const page = await inventoryService.marketplaceBrandProductsTable(brandId);

    expect(productModel.find.mock.calls[0][0]).toMatchObject({ _id: { $in: [] } });
    expect(page.rows).toEqual([]);
  });
});

describe('inventoryService listing-request reads', () => {
  it('lists only partner submissions and filters by review status', async () => {
    productModel.find.mockReturnValue(query([productDoc()]));

    await inventoryService.listProductRequests('PENDING');

    expect(productModel.find).toHaveBeenCalledWith({
      listing_submitted_by_id: { $exists: true, $nin: [null, ''] },
      listing_review_status: 'PENDING',
    });
  });

  it('drops the status clause when no status is asked for', async () => {
    productModel.find.mockReturnValue(query([]));
    await inventoryService.listProductRequests(null);
    expect(productModel.find.mock.calls[0][0].listing_review_status).toBeUndefined();
  });

  it('serves the review inbox table scoped to partner submissions', async () => {
    productModel.find.mockReturnValue(query([]));
    productModel.countDocuments.mockResolvedValue(3);

    const page = await inventoryService.productListingRequestsTable({ page: 1 });

    expect(productModel.find.mock.calls[0][0]).toMatchObject({
      listing_submitted_by_id: { $exists: true, $nin: [null, ''] },
    });
    expect(page.total).toBe(3);
  });
});

describe("inventoryService reads of a partner's own listings", () => {
  it('requires a signed-in caller', async () => {
    await expect(inventoryService.listMyProductListings(null)).rejects.toThrow(
      'Authentication required'
    );
    await expect(inventoryService.myProductListingsTable(null)).rejects.toThrow(
      'Authentication required'
    );
  });

  it('scopes the list to the caller and, optionally, one brand', async () => {
    productModel.find.mockReturnValue(query([]));
    await inventoryService.listMyProductListings(ADMIN, BRAND_ID);
    expect(productModel.find).toHaveBeenCalledWith({
      listing_submitted_by_id: 'u-admin-1',
      brand_id: new Types.ObjectId(BRAND_ID),
    });
  });

  it('ignores an unparseable brand id rather than widening the scope', async () => {
    productModel.find.mockReturnValue(query([]));
    await inventoryService.listMyProductListings(ADMIN, 'not-an-oid');
    expect(productModel.find).toHaveBeenCalledWith({ listing_submitted_by_id: 'u-admin-1' });
  });

  it('keeps the owner scope on the table page even with a brand filter', async () => {
    productModel.find.mockReturnValue(query([]));
    await inventoryService.myProductListingsTable(ADMIN, BRAND_ID, { page: 1 });
    expect(productModel.find.mock.calls[0][0]).toMatchObject({
      listing_submitted_by_id: 'u-admin-1',
      brand_id: new Types.ObjectId(BRAND_ID),
    });
  });
});

describe('inventoryService.listAvailablePodProducts', () => {
  it('restricts to live, approved, pod-available products of the asked-for category', async () => {
    brandModel.find.mockReturnValue(query([]));
    productModel.find.mockReturnValue(query([productDoc()]));
    podModel.find.mockReturnValue(query([]));

    await inventoryService.listAvailablePodProducts({
      super_category_id: BRAND_ID,
      category_id: 'not-an-oid',
      sub_category_id: null,
    });

    const filter = productModel.find.mock.calls[0][0];
    expect(filter).toMatchObject({
      is_active: true,
      status: 'ACTIVE',
      pod_available: true,
      listing_review_status: 'APPROVED',
      super_category_id: new Types.ObjectId(BRAND_ID),
    });
    // Invalid / absent category levels are simply not applied.
    expect(filter.category_id).toBeUndefined();
    expect(filter.sub_category_id).toBeUndefined();
    expect(filter.brand_id).toBeUndefined();
  });

  it('excludes the products of every deactivated brand', async () => {
    const deadBrand = new Types.ObjectId(BRAND_ID);
    brandModel.find.mockReturnValue(query([{ _id: deadBrand }]));
    productModel.find.mockReturnValue(query([]));

    await inventoryService.listAvailablePodProducts();

    expect(productModel.find.mock.calls[0][0].brand_id).toEqual({ $nin: [deadBrand] });
  });

  it('attaches the live pod stock to every product it returns', async () => {
    brandModel.find.mockReturnValue(query([]));
    productModel.find.mockReturnValue(query([productDoc()]));
    podModel.find.mockReturnValue(
      query([
        { product_requests: [{ product_id: PRODUCT_ID, quantity: 10, sold_count: 4 }] },
        { product_requests: [{ product_id: PRODUCT_ID, quantity: 3, sold_count: 3 }] },
      ])
    );

    const rows = await inventoryService.listAvailablePodProducts();

    expect(rows[0].pod_available_count).toBe(6);
  });
});

describe('inventoryService.podAvailabilityByProduct', () => {
  it('short-circuits on an empty id list without querying pods', async () => {
    const map = await inventoryService.podAvailabilityByProduct([]);
    expect(map.size).toBe(0);
    expect(podModel.find).not.toHaveBeenCalled();
  });

  it('sums available units per product and ignores unrelated line items', async () => {
    podModel.find.mockReturnValue(
      query([
        {
          product_requests: [
            { product_id: PRODUCT_ID, quantity: 8, sold_count: 2 },
            { product_id: 'some-other-product', quantity: 99 },
            { product_id: PRODUCT_ID, quantity: 1, sold_count: 5 },
          ],
        },
        { product_requests: null },
      ])
    );

    const map = await inventoryService.podAvailabilityByProduct([PRODUCT_ID]);

    // 6 available from the first request; the oversold one clamps to 0.
    expect(map.get(PRODUCT_ID)).toBe(6);
    expect(map.has('some-other-product')).toBe(false);
    expect(podModel.find.mock.calls[0][0]).toMatchObject({
      products_enabled: true,
      is_active: true,
      venue_approval_status: { $ne: 'PENDING' },
    });
  });
});

describe('inventoryService.getById and the forward counters', () => {
  it('returns null for a product that does not exist', async () => {
    productModel.findById.mockResolvedValue(null);
    await expect(inventoryService.getById(PRODUCT_ID)).resolves.toBeNull();
  });

  it('returns the public shape for a product that does', async () => {
    productModel.findById.mockResolvedValue(productDoc());
    await expect(inventoryService.getById(PRODUCT_ID)).resolves.toMatchObject({
      id: PRODUCT_ID,
      sku: 'CAP00001',
    });
  });

  it.each([
    ['a view', () => inventoryService.recordProductView('not-an-oid')],
    ['a click', () => inventoryService.recordProductClick('not-an-oid')],
  ])('ignores %s against an unparseable product id', async (_case, run) => {
    await expect(run()).resolves.toBe(false);
    expect(productModel.updateOne).not.toHaveBeenCalled();
  });

  it('increments the product view counter', async () => {
    productModel.updateOne.mockResolvedValue({});
    await expect(inventoryService.recordProductView(PRODUCT_ID)).resolves.toBe(true);
    expect(productModel.updateOne).toHaveBeenCalledWith(
      { _id: PRODUCT_ID },
      { $inc: { view_count: 1 } }
    );
  });

  it('increments the product click counter alone when no variant is named', async () => {
    productModel.updateOne.mockResolvedValue({});
    await inventoryService.recordProductClick(PRODUCT_ID, null);
    expect(productModel.updateOne).toHaveBeenCalledWith(
      { _id: PRODUCT_ID },
      { $inc: { click_count: 1 } },
      {}
    );
  });

  it('also increments the named variant click counter via an array filter', async () => {
    productModel.updateOne.mockResolvedValue({});
    await inventoryService.recordProductClick(PRODUCT_ID, VARIANT_ID);
    expect(productModel.updateOne).toHaveBeenCalledWith(
      { _id: PRODUCT_ID },
      { $inc: { click_count: 1, 'variants.$[v].click_count': 1 } },
      { arrayFilters: [{ 'v._id': new Types.ObjectId(VARIANT_ID) }] }
    );
  });
});

describe('the public product shape', () => {
  it('fills every field with a safe default for a bare document', async () => {
    productModel.findById.mockResolvedValue({ _id: 'bare' });

    const pub = await inventoryService.getById('bare');

    expect(pub).toMatchObject({
      id: 'bare',
      product_name: '',
      sku: '',
      options: [],
      variants: [],
      categories: [],
      images: [],
      tags: [],
      barcode: '',
      brand_id: null,
      category_id: null,
      super_category_id: null,
      sub_category_id: null,
      pickup_location_id: null,
      product_type: 'CONSUMABLE',
      unit_type: 'PIECE',
      min_order_qty: 1,
      max_order_qty: 100,
      low_stock_alert: 5,
      notify_low_stock: false,
      inventory_count: 0,
      available_count: 0,
      pod_available_count: 0,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      listing_review_status: 'APPROVED',
      ownership: 'DUNCIT',
      commission_pct: 5,
      delivery_target: 'HOST',
      free_delivery_above: null,
      expiry_date: null,
      manufacturing_date: null,
      is_active: false,
      pod_available: false,
      created_at: '',
      updated_at: '',
    });
  });

  it('maps options, variants and category rows, and nets the available count', async () => {
    productModel.findById.mockResolvedValue({
      _id: 'full',
      product_name: 'Duncit Cap',
      sku: 'CAP1',
      barcode: '8901234567890',
      options: [{ name: 'Colour', values: ['Red'] }, {}],
      variants: [
        {
          _id: 'v1',
          option_label: 'Red / S',
          option_values: [{ name: 'Colour', value: 'Red' }, {}],
          sku: 'V1',
          color: 'Red',
          size_label: 'S',
          description: 'small red',
          unit_cost: 100,
          inventory_count: 3,
          images: ['https://cdn.duncit.com/red.png'],
          height_cm: 1,
          breadth_cm: 2,
          length_cm: 3,
          weight_kg: 0.5,
        },
        { _id: 'v2' },
      ],
      categories: [
        {
          super_category_id: 'sc',
          category_id: 'c',
          sub_category_id: 'sub',
          super_category_name: 'Apparel',
          category_name: 'Tops',
          sub_category_name: 'Caps',
        },
        {},
      ],
      brand_id: 'b1',
      category_id: 'c',
      super_category_id: 'sc',
      sub_category_id: 'sub',
      pickup_location_id: 'w1',
      images: ['https://cdn.duncit.com/cap.png'],
      tags: ['merch'],
      inventory_count: 10,
      requested_count: 2,
      reserved_count: 1,
      damaged_count: 4,
      notify_low_stock: true,
      pod_available: true,
      host_request_allowed: true,
      delivery_available: true,
      is_duncit_delivery_partner: true,
      is_active: true,
      free_delivery_above: 999,
      expiry_date: new Date('2026-12-31T00:00:00.000Z'),
      manufacturing_date: new Date('2026-01-01T00:00:00.000Z'),
      created_at: new Date('2026-02-01T00:00:00.000Z'),
      updated_at: new Date('2026-02-02T00:00:00.000Z'),
    });

    const pub = await inventoryService.getById('full');

    expect(pub).toMatchObject({
      barcode: '8901234567890',
      brand_id: 'b1',
      pickup_location_id: 'w1',
      // 10 in stock, 2 requested and 1 reserved leaves 7 sellable.
      available_count: 7,
      free_delivery_above: 999,
      expiry_date: '2026-12-31T00:00:00.000Z',
      manufacturing_date: '2026-01-01T00:00:00.000Z',
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-02T00:00:00.000Z',
      is_duncit_delivery_partner: true,
      notify_low_stock: true,
    });
    expect(pub!.options).toEqual([
      { name: 'Colour', values: ['Red'] },
      { name: '', values: [] },
    ]);
    expect(pub!.variants[0]).toEqual({
      id: 'v1',
      option_label: 'Red / S',
      option_values: [{ name: 'Colour', value: 'Red' }, { name: '', value: '' }],
      sku: 'V1',
      color: 'Red',
      size_label: 'S',
      description: 'small red',
      unit_cost: 100,
      inventory_count: 3,
      images: ['https://cdn.duncit.com/red.png'],
      height_cm: 1,
      breadth_cm: 2,
      length_cm: 3,
      weight_kg: 0.5,
    });
    expect(pub!.variants[1]).toMatchObject({
      id: 'v2',
      option_label: '',
      option_values: [],
      images: [],
      unit_cost: 0,
    });
    expect(pub!.categories).toEqual([
      {
        super_category_id: 'sc',
        category_id: 'c',
        sub_category_id: 'sub',
        super_category_name: 'Apparel',
        category_name: 'Tops',
        sub_category_name: 'Caps',
      },
      {
        super_category_id: null,
        category_id: null,
        sub_category_id: null,
        super_category_name: '',
        category_name: '',
        sub_category_name: '',
      },
    ]);
  });
});

describe('inventoryService.create', () => {
  const createInput = (over: Record<string, unknown> = {}) => ({
    product_name: '  Duncit Cap  ',
    unit_cost: 250,
    pickup_location_id: WAREHOUSE_ID,
    ...over,
  });

  it.each([
    ['a negative cost', { unit_cost: -1 }, 'Product cost cannot be negative'],
    ['negative stock', { inventory_count: -1 }, 'Inventory count cannot be negative'],
    [
      'a min order qty above the max',
      { min_order_qty: 10, max_order_qty: 2 },
      'Min order qty cannot exceed max order qty',
    ],
  ])('rejects %s', async (_case, override, message) => {
    await expect(inventoryService.create(createInput(override), ADMIN)).rejects.toThrow(message);
    expect(productModel.create).not.toHaveBeenCalled();
  });

  it('requires a warehouse on every Duncit-owned product', async () => {
    await expect(
      inventoryService.create(createInput({ pickup_location_id: null }), ADMIN)
    ).rejects.toThrow('A warehouse (pickup location) is required');
  });

  it('rejects a warehouse that is not owned by Duncit', async () => {
    warehouseModel.findById.mockReturnValue(query({ owner_kind: 'BRAND' }));
    await expect(inventoryService.create(createInput(), ADMIN)).rejects.toThrow(
      'Select a valid Duncit warehouse'
    );
  });

  it('rejects a SKU that is already taken', async () => {
    productModel.findOne.mockResolvedValue(productDoc());
    await expect(inventoryService.create(createInput({ sku: 'cap00001' }), ADMIN)).rejects.toThrow(
      'Product SKU already exists'
    );
  });

  it('upper-cases the supplied SKU, forces Duncit ownership and journals the opening stock', async () => {
    productModel.findOne.mockResolvedValue(null);
    const doc = productDoc({ inventory_count: 0, brand_id: 'stale' });
    productModel.create.mockResolvedValue(doc);

    const pub = await inventoryService.create(
      createInput({
        sku: '  cap-9  ',
        inventory_count: 25,
        expiry_date: '2026-12-31T00:00:00.000Z',
        manufacturing_date: null,
        tags: ['merch'],
      }),
      ADMIN
    );

    expect(productModel.findOne).toHaveBeenCalledWith({ sku: 'CAP-9' });
    expect(productModel.create.mock.calls[0][0]).toMatchObject({
      product_name: 'Duncit Cap',
      sku: 'CAP-9',
      unit_cost: 250,
      last_updated_by_name: 'ops@duncit.com',
    });
    expect(doc.ownership).toBe('DUNCIT');
    expect(doc.brand_id).toBeNull();
    expect(doc.expiry_date).toEqual(new Date('2026-12-31T00:00:00.000Z'));
    expect(doc.manufacturing_date).toBeNull();
    expect(doc.tags).toEqual(['merch']);
    expect(movementModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'IN', quantity: 25, reason: 'Initial stock', balance_after: 25 })
    );
    expect(pub.inventory_count).toBe(25);
  });

  it('generates a SKU when none is supplied and skips the opening-stock entry at zero', async () => {
    productModel.findOne.mockResolvedValue(null);
    productModel.create.mockResolvedValue(productDoc({ inventory_count: 0 }));

    await inventoryService.create(createInput({ sku: '   ', inventory_count: 0 }), ADMIN);

    expect(productModel.findOne.mock.calls[0][0].sku).toMatch(/^[A-Z2-9]{8}$/);
    expect(movementModel.create).not.toHaveBeenCalled();
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', changed_fields: ['*'] })
    );
  });
});

describe('inventoryService.update', () => {
  it('404s on a product that does not exist', async () => {
    productModel.findById.mockResolvedValue(null);
    await expect(inventoryService.update(PRODUCT_ID, {}, ADMIN)).rejects.toThrow(
      'Product not found'
    );
  });

  it('rejects a SKU already used by another product', async () => {
    productModel.findById.mockResolvedValue(productDoc());
    productModel.findOne.mockResolvedValue(productDoc({ _id: 'other' }));
    await expect(
      inventoryService.update(PRODUCT_ID, { sku: 'taken' }, ADMIN)
    ).rejects.toThrow('Product SKU already exists');
    expect(productModel.findOne).toHaveBeenCalledWith({
      sku: 'TAKEN',
      _id: { $ne: PRODUCT_ID },
    });
  });

  it('skips the uniqueness check when the SKU is unchanged', async () => {
    productModel.findById.mockResolvedValue(productDoc({ pickup_location_id: WAREHOUSE_ID }));
    await inventoryService.update(PRODUCT_ID, { sku: 'cap00001' }, ADMIN);
    expect(productModel.findOne).not.toHaveBeenCalled();
  });

  it('journals field edits and stock edits separately', async () => {
    const doc = productDoc({ pickup_location_id: WAREHOUSE_ID, inventory_count: 10 });
    productModel.findById.mockResolvedValue(doc);

    const pub = await inventoryService.update(
      PRODUCT_ID,
      { product_name: 'Duncit Cap v2', inventory_count: 14, reserved_count: 2, damaged_count: 1 },
      ADMIN
    );

    expect(pub.product_name).toBe('Duncit Cap v2');
    // Stock fields never appear in the activity log — they have their own ledger.
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', changed_fields: ['product_name'] })
    );
    expect(movementModel.create).toHaveBeenCalledTimes(3);
    const types = movementModel.create.mock.calls.map((call) => call[0].type);
    expect(types).toEqual(['ADJUST', 'RESERVE', 'DAMAGE']);
  });

  it('writes no activity entry when nothing tracked changed', async () => {
    productModel.findById.mockResolvedValue(productDoc({ pickup_location_id: WAREHOUSE_ID }));
    await inventoryService.update(PRODUCT_ID, {}, ADMIN);
    expect(activityModel.create).not.toHaveBeenCalled();
    expect(movementModel.create).not.toHaveBeenCalled();
  });

  it('re-checks the Duncit warehouse after the edit', async () => {
    productModel.findById.mockResolvedValue(productDoc());
    await expect(
      inventoryService.update(PRODUCT_ID, { pickup_location_id: null }, ADMIN)
    ).rejects.toThrow('A warehouse (pickup location) is required');
  });

  it('does not require a warehouse on a BRAND-owned product', async () => {
    productModel.findById.mockResolvedValue(
      productDoc({ ownership: 'BRAND', pickup_location_id: null })
    );
    await expect(
      inventoryService.update(PRODUCT_ID, { product_name: 'Renamed' }, ADMIN)
    ).resolves.toMatchObject({ product_name: 'Renamed' });
    expect(warehouseModel.findById).not.toHaveBeenCalled();
  });

  it('falls back to "system" as the editor when there is no acting user', async () => {
    const doc = productDoc({ ownership: 'BRAND' });
    productModel.findById.mockResolvedValue(doc);
    await inventoryService.update(PRODUCT_ID, { product_name: 'Renamed' }, null);
    expect(doc.last_updated_by_name).toBe('system');
    expect(doc.last_updated_by_id).toBeNull();
  });
});

describe('inventoryService lifecycle mutations', () => {
  it.each([
    ['remove', () => inventoryService.remove(PRODUCT_ID, ADMIN)],
    ['archive', () => inventoryService.archive(PRODUCT_ID, ADMIN)],
    ['restore', () => inventoryService.restore(PRODUCT_ID, ADMIN)],
    ['permanentlyDelete', () => inventoryService.permanentlyDelete(PRODUCT_ID, ADMIN)],
    ['duplicate', () => inventoryService.duplicate(PRODUCT_ID, ADMIN)],
    [
      'recordStockMovement',
      () => inventoryService.recordStockMovement(PRODUCT_ID, { type: 'IN', quantity: 1 }, ADMIN),
    ],
  ])('%s 404s on a product that does not exist', async (_case, run) => {
    productModel.findById.mockResolvedValue(null);
    await expect(run()).rejects.toThrow('Product not found');
  });

  it('remove soft-archives the product', async () => {
    const doc = productDoc();
    productModel.findById.mockResolvedValue(doc);

    await expect(inventoryService.remove(PRODUCT_ID, ADMIN)).resolves.toBe(true);

    expect(doc).toMatchObject({ is_active: false, status: 'ARCHIVED' });
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', changed_fields: ['status', 'is_active'] })
    );
  });

  it('archive and restore flip the status pair', async () => {
    const doc = productDoc();
    productModel.findById.mockResolvedValue(doc);

    await inventoryService.archive(PRODUCT_ID, ADMIN);
    expect(doc).toMatchObject({ status: 'ARCHIVED', is_active: false });

    await inventoryService.restore(PRODUCT_ID, ADMIN);
    expect(doc).toMatchObject({ status: 'ACTIVE', is_active: true });

    const actions = activityModel.create.mock.calls.map((call) => call[0].action);
    expect(actions).toEqual(['ARCHIVE', 'RESTORE']);
  });

  it('permanentlyDelete logs the SKU before hard-deleting the row', async () => {
    productModel.findById.mockResolvedValue(productDoc());
    productModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await expect(inventoryService.permanentlyDelete(PRODUCT_ID, ADMIN)).resolves.toBe(true);

    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', notes: 'Hard-deleted CAP00001' })
    );
    expect(productModel.deleteOne).toHaveBeenCalledWith({ _id: PRODUCT_ID });
  });

  it('duplicate copies the product as a zero-stock DRAFT with a fresh SKU', async () => {
    productModel.findById.mockResolvedValue(
      productDoc({ inventory_count: 40, reserved_count: 5, damaged_count: 2, requested_count: 3 })
    );
    productModel.create.mockImplementation((obj: Record<string, unknown>) =>
      Promise.resolve(productDoc({ ...obj, _id: 'copy-1' }))
    );

    const copy = await inventoryService.duplicate(PRODUCT_ID, ADMIN);

    const payload = productModel.create.mock.calls[0][0];
    expect(payload).toMatchObject({
      product_name: 'Duncit Cap (copy)',
      status: 'DRAFT',
      inventory_count: 0,
      reserved_count: 0,
      damaged_count: 0,
      requested_count: 0,
    });
    expect(payload.sku).toMatch(/^[A-Z2-9]{8}$/);
    expect(payload._id).toBeUndefined();
    expect(copy.id).toBe('copy-1');
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DUPLICATE', notes: 'Duplicated from CAP00001' })
    );
  });
});

describe('inventoryService.recordStockMovement', () => {
  it('rejects a zero quantity', async () => {
    productModel.findById.mockResolvedValue(productDoc());
    await expect(
      inventoryService.recordStockMovement(PRODUCT_ID, { type: 'IN', quantity: 0 }, ADMIN)
    ).rejects.toThrow('Quantity is required');
  });

  it('rejects an unknown movement type', async () => {
    productModel.findById.mockResolvedValue(productDoc());
    await expect(
      inventoryService.recordStockMovement(PRODUCT_ID, { type: 'TELEPORT', quantity: 1 }, ADMIN)
    ).rejects.toThrow('Unknown movement type');
  });

  it('refuses to take out more stock than there is', async () => {
    productModel.findById.mockResolvedValue(productDoc({ inventory_count: 3 }));
    await expect(
      inventoryService.recordStockMovement(PRODUCT_ID, { type: 'OUT', quantity: 4 }, ADMIN)
    ).rejects.toThrow('Insufficient stock');
  });

  it.each([
    ['IN', 5, { inventory_count: 15 }, 5],
    ['OUT', 4, { inventory_count: 6 }, -4],
    ['RESERVE', 3, { reserved_count: 3 }, 3],
    ['ADJUST', 2, { inventory_count: 2 }, 2],
    ['DAMAGE', 2, { damaged_count: 2, inventory_count: 8 }, 2],
  ])('applies a %s of %i to the counters and the ledger', async (type, quantity, expected, ledgerQty) => {
    const doc = productDoc({ inventory_count: 10, reserved_count: 0, damaged_count: 0 });
    productModel.findById.mockResolvedValue(doc);

    await inventoryService.recordStockMovement(
      PRODUCT_ID,
      { type, quantity: -quantity, reason: 'stock take' },
      ADMIN
    );

    expect(doc).toMatchObject(expected);
    expect(movementModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type,
        quantity: ledgerQty,
        reason: 'stock take',
        balance_after: doc.inventory_count,
      })
    );
  });

  it('clamps a release at zero and records it as a negative movement', async () => {
    const doc = productDoc({ reserved_count: 2 });
    productModel.findById.mockResolvedValue(doc);

    await inventoryService.recordStockMovement(
      PRODUCT_ID,
      { type: 'RELEASE', quantity: 9 },
      ADMIN
    );

    expect(doc.reserved_count).toBe(0);
    expect(movementModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RELEASE', quantity: -9, reason: '' })
    );
  });

  it('clamps damaged stock at zero rather than going negative', async () => {
    const doc = productDoc({ inventory_count: 1 });
    productModel.findById.mockResolvedValue(doc);
    await inventoryService.recordStockMovement(PRODUCT_ID, { type: 'DAMAGE', quantity: 5 }, ADMIN);
    expect(doc.inventory_count).toBe(0);
    expect(doc.damaged_count).toBe(5);
  });
});

describe('inventoryService pod reads', () => {
  it('lists the pods linked to a product', async () => {
    podModel.find.mockReturnValue(
      query([
        { _id: 'pod-1', pod_id: 'DUN-POD-1', pod_title: 'Friday Jam', club_id: 'club-1', is_active: true },
        { _id: 'pod-2' },
      ])
    );

    const rows = await inventoryService.listLinkedPods(PRODUCT_ID);

    expect(rows).toEqual([
      { id: 'pod-1', pod_id: 'DUN-POD-1', pod_title: 'Friday Jam', club_id: 'club-1', is_active: true },
      { id: 'pod-2', pod_id: '', pod_title: '', club_id: '', is_active: false },
    ]);
  });

  it('returns no purchase options for an unparseable product id', async () => {
    await expect(inventoryService.podsForProduct('not-an-oid')).resolves.toEqual([]);
    expect(podModel.find).not.toHaveBeenCalled();
  });

  it('returns no purchase options when no live pod stocks the product', async () => {
    podModel.find.mockReturnValue(query([]));
    await expect(inventoryService.podsForProduct(PRODUCT_ID)).resolves.toEqual([]);
    expect(productModel.findById).not.toHaveBeenCalled();
  });

  it('builds one purchase option per live pod, with the club slug and live threshold', async () => {
    podModel.find.mockReturnValue(
      query([
        {
          _id: 'pod-1',
          pod_title: 'Friday Jam',
          club_id: 'club-1',
          product_requests: [
            {
              product_id: PRODUCT_ID,
              product_name: 'Duncit Cap',
              unit_cost: 250,
              quantity: 10,
              sold_count: 4,
              images: ['https://cdn.duncit.com/cap.png'],
            },
          ],
        },
        { _id: 'pod-2', product_requests: [{ product_id: 'someone-else' }] },
      ])
    );
    productModel.findById.mockReturnValue(query({ free_delivery_above: 999 }));
    clubModel.find.mockReturnValue(query([{ _id: 'club-1', club_id: 'duncit-club' }]));

    const options = await inventoryService.podsForProduct(PRODUCT_ID);

    expect(options).toEqual([
      {
        pod_id: 'pod-1',
        pod_title: 'Friday Jam',
        club_slug: 'duncit-club',
        product_name: 'Duncit Cap',
        unit_cost: 250,
        available_count: 6,
        free_delivery_above: 999,
        image_url: 'https://cdn.duncit.com/cap.png',
      },
    ]);
  });

  it('falls back to an empty slug and threshold when the pod has no club and the product no offer', async () => {
    podModel.find.mockReturnValue(
      query([{ _id: 'pod-1', product_requests: [{ product_id: PRODUCT_ID, quantity: 2 }] }])
    );
    productModel.findById.mockReturnValue(query(null));

    const options = await inventoryService.podsForProduct(PRODUCT_ID);

    expect(clubModel.find).not.toHaveBeenCalled();
    expect(options[0]).toMatchObject({
      club_slug: '',
      free_delivery_above: null,
      available_count: 2,
      image_url: '',
      product_name: '',
      unit_cost: 0,
    });
  });
});

describe('inventoryService ledger reads', () => {
  it('maps activity log rows and clamps the limit to at least one', async () => {
    activityModel.find.mockReturnValue(
      query([
        {
          _id: 'log-1',
          product_id: PRODUCT_ID,
          user_id: 'u1',
          user_name: 'ops',
          action: 'UPDATE',
          changed_fields: ['sku'],
          notes: 'renamed',
          created_at: new Date('2026-02-01T00:00:00.000Z'),
        },
        { _id: 'log-2', product_id: PRODUCT_ID, action: 'CREATE' },
      ])
    );

    const rows = await inventoryService.listActivityLogs(PRODUCT_ID, 0);

    expect(rows[0]).toEqual({
      id: 'log-1',
      product_id: PRODUCT_ID,
      user_id: 'u1',
      user_name: 'ops',
      action: 'UPDATE',
      changed_fields: ['sku'],
      notes: 'renamed',
      created_at: '2026-02-01T00:00:00.000Z',
    });
    expect(rows[1]).toMatchObject({ user_id: null, user_name: '', changed_fields: [], created_at: '' });
  });

  it('maps stock movement rows and clamps the limit to the 500 ceiling', async () => {
    const limitSpy = jest.fn().mockResolvedValue([
      {
        _id: 'mv-1',
        product_id: PRODUCT_ID,
        user_id: null,
        type: 'IN',
        quantity: 5,
        created_at: new Date('2026-02-02T00:00:00.000Z'),
      },
    ]);
    movementModel.find.mockReturnValue({ sort: jest.fn(() => ({ limit: limitSpy })) });

    const rows = await inventoryService.listStockMovements(PRODUCT_ID, 5000);

    expect(limitSpy).toHaveBeenCalledWith(500);
    expect(rows[0]).toMatchObject({
      id: 'mv-1',
      type: 'IN',
      quantity: 5,
      reason: '',
      balance_after: 0,
      user_name: '',
      created_at: '2026-02-02T00:00:00.000Z',
    });
  });
});

describe('inventoryService.analytics', () => {
  it('returns one bucket per day of the requested window', async () => {
    movementModel.find.mockReturnValue(query([]));
    const rows = await inventoryService.analytics(PRODUCT_ID, 30);
    expect(rows).toHaveLength(30);
    expect(rows[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rows[0]).toMatchObject({ in_qty: 0, out_qty: 0, net_qty: 0 });
    // Consecutive, ascending days.
    expect(new Date(rows[1].date).getTime() - new Date(rows[0].date).getTime()).toBe(86_400_000);
    expect(movementModel.find.mock.calls[0][0].created_at.$gte).toBeInstanceOf(Date);
  });

  it.each([
    ['clamps a zero window to a single day', 0, 1],
    ['clamps an over-long window to 180 days', 5000, 180],
  ])('%s', async (_case, days, expected) => {
    movementModel.find.mockReturnValue(query([]));
    const rows = await inventoryService.analytics(PRODUCT_ID, days);
    expect(rows).toHaveLength(expected);
  });

  it('splits movements into in/out on the day they happened and ignores older ones', async () => {
    movementModel.find.mockReturnValue(query([]));
    const [{ date: day }] = await inventoryService.analytics(PRODUCT_ID, 30);

    movementModel.find.mockReturnValue(
      query([
        { created_at: new Date(`${day}T06:00:00.000Z`), quantity: 5 },
        { created_at: new Date(`${day}T07:00:00.000Z`), quantity: -2 },
        { created_at: new Date('2000-01-01T00:00:00.000Z'), quantity: 99 },
      ])
    );

    const rows = await inventoryService.analytics(PRODUCT_ID, 30);

    expect(rows.find((row) => row.date === day)).toEqual({
      date: day,
      in_qty: 5,
      out_qty: 2,
      net_qty: 3,
    });
    // The movement from outside the window never lands in a bucket.
    expect(rows.reduce((sum, row) => sum + row.in_qty, 0)).toBe(5);
  });
});
