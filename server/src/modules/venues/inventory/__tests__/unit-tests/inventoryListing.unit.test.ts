/**
 * Unit cover for the PARTNER listing half of the inventory service: the
 * Ecomm-Manager gate, the server-side mirror of the listing form's rules,
 * variant normalisation, the quantity/settings edits and the review decision.
 * Every model is faked so each assertion is about a rule, not about Mongo.
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
  },
}));
jest.mock('../../inventoryActivityLog.model', () => ({
  InventoryActivityLogModel: { create: jest.fn(), find: jest.fn() },
}));
jest.mock('../../inventoryStockMovement.model', () => ({
  InventoryStockMovementModel: { create: jest.fn(), find: jest.fn() },
}));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
// An approved listing now tells its owner over WhatsApp. Unmocked, the real
// transport runs and the test dies on the 5s timeout instead of asserting.
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({
  whatsappService: { send: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@modules/access/user/relations', () => ({ UserRoleModel: { find: jest.fn() } }));
jest.mock('@modules/venues/ecommBrand/ecommBrand.model', () => ({
  EcommBrandModel: { findById: jest.fn(), find: jest.fn() },
}));
jest.mock('@modules/venues/brandPickupLocation/brandPickupLocation.model', () => ({
  BrandPickupLocationModel: { findById: jest.fn() },
}));
jest.mock('@modules/pods/pod/pod.model', () => ({
  PodModel: { find: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { find: jest.fn() } }));
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

import type { AuthUser } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { moderationService } from '@modules/moderation/moderation.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { logs } from '@observability/log';
import { inventoryService } from '../../inventory.service';
import { InventoryProductModel } from '../../inventory.model';
import { InventoryActivityLogModel } from '../../inventoryActivityLog.model';
import { InventoryStockMovementModel } from '../../inventoryStockMovement.model';

const productModel = InventoryProductModel as unknown as Record<string, jest.Mock>;
const activityModel = InventoryActivityLogModel as unknown as Record<string, jest.Mock>;
const movementModel = InventoryStockMovementModel as unknown as Record<string, jest.Mock>;
const userModel = UserModel as unknown as Record<string, jest.Mock>;
const roleModel = UserRoleModel as unknown as Record<string, jest.Mock>;
const brandModel = EcommBrandModel as unknown as Record<string, jest.Mock>;
const warehouseModel = BrandPickupLocationModel as unknown as Record<string, jest.Mock>;
const podModel = PodModel as unknown as Record<string, jest.Mock>;
const orderModel = ProductOrderModel as unknown as Record<string, jest.Mock>;
const notifyCreate = notificationService.create as unknown as jest.Mock;
const moderate = moderationService.assertProductCleanOrThrow as unknown as jest.Mock;

const BRAND_ID = '65c000000000000000000001';
const SUPER_ID = '65c000000000000000000002';
const CATEGORY_ID = '65c000000000000000000003';
const SUB_ID = '65c000000000000000000004';
const WAREHOUSE_ID = '65c000000000000000000005';

const PARTNER = { id: '65c000000000000000000011', email: 'brand@duncit.com' } as unknown as AuthUser;
const REVIEWER = { id: '65c000000000000000000012', email: 'ops@duncit.com' } as unknown as AuthUser;

/** Chainable query stub: every terminal step resolves to `result`. */
const query = (result: unknown) => {
  const q: Record<string, unknown> = {};
  q.sort = jest.fn(() => q);
  q.select = jest.fn(() => q);
  q.limit = jest.fn(() => Promise.resolve(result));
  q.lean = jest.fn(() => Promise.resolve(result));
  q.then = (onOk: (v: unknown) => unknown, onErr: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onOk, onErr);
  return q;
};

/** A hydrated product document as the service sees it after a find. */
const productDoc = (over: Record<string, unknown> = {}) => {
  const doc: Record<string, any> = {
    _id: 'p1',
    product_name: 'Duncit Tee',
    sku: 'TEE00001',
    inventory_count: 12,
    reserved_count: 0,
    damaged_count: 0,
    requested_count: 0,
    low_stock_alert: 5,
    notify_low_stock: false,
    commission_pct: 10,
    variants: [],
    options: [],
    categories: [],
    listing_submitted_by_id: PARTNER.id,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    ...over,
  };
  doc.save = jest.fn().mockResolvedValue(undefined);
  doc.toObject = jest.fn(() => ({ ...doc }));
  return doc;
};

/** A payload that passes every listing rule; tests override one field. */
const listingInput = (over: Record<string, unknown> = {}) => ({
  product_name: 'Duncit Tee',
  brand_id: BRAND_ID,
  super_category_id: SUPER_ID,
  category_id: CATEGORY_ID,
  sub_category_id: SUB_ID,
  image_url: 'https://cdn.duncit.com/tee.png',
  images: ['https://cdn.duncit.com/tee-back.png'],
  description: 'A comfortable cotton tee made for pod nights.',
  inventory_count: 12,
  unit_cost: 499,
  commission_pct: 10,
  ...over,
});

/**
 * Let requireEcommManager through (or not) for the next call.
 *
 * Roles resolve from the user_roles relation first and fall back to the
 * metadata cache only for an account with no rows yet, so both are driven —
 * mocking the cache alone left the gate reading an empty relation.
 */
const withRoles = (roles: string[]) => {
  roleModel.find.mockReturnValue(query(roles.map((role) => ({ role }))));
  userModel.findById.mockReturnValue(query({ metadata: { role_keys: roles } }));
};

beforeEach(() => {
  withRoles(['ECOMM_MANAGER']);
  brandModel.findById.mockReturnValue(query({ is_active: true }));
  productModel.exists.mockResolvedValue(null);
  activityModel.create.mockResolvedValue({});
  movementModel.create.mockResolvedValue({});
  notifyCreate.mockResolvedValue({});
});

describe('the Ecomm Manager gate', () => {
  it('rejects an anonymous caller before any lookup', async () => {
    await expect(inventoryService.submitProductListing(listingInput(), null)).rejects.toThrow(
      'Authentication required'
    );
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('rejects a signed-in user who does not hold the ECOMM_MANAGER role', async () => {
    withRoles(['USER']);
    await expect(inventoryService.submitProductListing(listingInput(), PARTNER)).rejects.toThrow(
      'You must be an Ecomm Manager to manage product listings'
    );
    expect(productModel.create).not.toHaveBeenCalled();
  });

  it('treats a user with neither relation rows nor role metadata as role-less', async () => {
    roleModel.find.mockReturnValue(query([]));
    userModel.findById.mockReturnValue(query(null));
    await expect(inventoryService.submitProductListing(listingInput(), PARTNER)).rejects.toThrow(
      /Ecomm Manager/
    );
  });
});

describe('listing input rules (server-side mirror of the form)', () => {
  it.each([
    ['a blank title', { product_name: '   ' }, 'Product title is required'],
    ['no brand', { brand_id: '' }, 'Select the brand this product belongs to'],
    ['an unparseable brand id', { brand_id: 'not-an-oid' }, 'Select the brand this product belongs to'],
    [
      'an incomplete category triple',
      { sub_category_id: null },
      'Select a Super category, Category and Sub category',
    ],
    [
      'no usable image url',
      { image_url: 'file:///tmp/x.png', images: ['ftp://x/y.png'] },
      'Upload at least one product image before submitting',
    ],
    ['a too-short description', { description: 'Too short' }, 'at least 20 characters'],
    ['zero stock', { inventory_count: 0 }, 'Inventory availability must be at least 1'],
    ['a free price', { unit_cost: 0 }, 'Product price must be greater than 0'],
    ['commission under 5%', { commission_pct: 4 }, 'Commission must be between 5% and 50%'],
    ['commission over 50%', { commission_pct: 51 }, 'Commission must be between 5% and 50%'],
    [
      'a negative free-delivery threshold',
      { free_delivery_above: -1 },
      'Free-delivery threshold cannot be negative',
    ],
    [
      'a non-numeric free-delivery threshold',
      { free_delivery_above: 'lots' },
      'Free-delivery threshold cannot be negative',
    ],
  ])('rejects %s', async (_case, override, message) => {
    await expect(
      inventoryService.submitProductListing(listingInput(override), PARTNER)
    ).rejects.toThrow(message);
    expect(productModel.create).not.toHaveBeenCalled();
  });

  it.each([
    ['a free variant', [{ option_label: 'Small', unit_cost: 0 }], 'Price for Small must be greater than 0'],
    [
      'negative variant stock',
      [{ option_label: 'Small', unit_cost: 100, inventory_count: -1 }],
      'Stock for Small cannot be negative',
    ],
    [
      'two variants with the same option combination',
      [
        { option_label: 'Red / S', unit_cost: 100, option_values: [{ name: 'Colour', value: 'Red' }] },
        { option_label: 'Red / S', unit_cost: 100, option_values: [{ name: 'Colour', value: 'red' }] },
      ],
      'Duplicate variant combination',
    ],
    [
      'an unlabelled variant priced at zero',
      [{ unit_cost: 0 }],
      'Price for variant must be greater than 0',
    ],
  ])('rejects %s', async (_case, variants, message) => {
    await expect(
      inventoryService.submitProductListing(listingInput({ variants }), PARTNER)
    ).rejects.toThrow(message);
  });

  it('sends the title, every variant label and the union of images to moderation', async () => {
    productModel.create.mockResolvedValue(productDoc());
    await inventoryService.submitProductListing(
      listingInput({
        variants: [
          {
            option_label: 'Red / S',
            size_label: 'S',
            description: 'small',
            unit_cost: 100,
            inventory_count: 2,
            images: ['https://cdn.duncit.com/tee-red.png'],
          },
        ],
      }),
      PARTNER
    );

    expect(moderate).toHaveBeenCalledWith({
      product_name: 'Duncit Tee',
      variants: [{ option_label: 'Red / S', size_label: 'S', description: 'small' }],
      image_urls: [
        'https://cdn.duncit.com/tee.png',
        'https://cdn.duncit.com/tee-back.png',
        'https://cdn.duncit.com/tee-red.png',
      ],
    });
  });

  it('blocks a listing for a deactivated brand', async () => {
    brandModel.findById.mockReturnValue(query({ is_active: false }));
    await expect(inventoryService.submitProductListing(listingInput(), PARTNER)).rejects.toThrow(
      'This brand is deactivated and cannot list new products'
    );
  });
});

describe('inventoryService.submitProductListing', () => {
  it('creates a PENDING, unpublished listing owned by the submitting partner', async () => {
    const doc = productDoc();
    productModel.create.mockResolvedValue(doc);

    const pub = await inventoryService.submitProductListing(
      listingInput({ free_delivery_above: '', delivery_target: 'SHIPROCKET' }),
      PARTNER
    );

    const payload = productModel.create.mock.calls[0][0];
    expect(payload).toMatchObject({
      product_name: 'Duncit Tee',
      ownership: 'BRAND',
      status: 'DRAFT',
      visibility: 'INTERNAL',
      is_active: false,
      pod_available: false,
      host_request_allowed: false,
      listing_review_status: 'PENDING',
      listing_submitted_by_id: PARTNER.id,
      listing_submitted_by_name: 'brand@duncit.com',
      supplier_contact: 'brand@duncit.com',
      delivery_target: 'SHIPROCKET',
      free_delivery_above: null,
      short_description: 'A comfortable cotton tee made for pod nights.',
      image_url: 'https://cdn.duncit.com/tee.png',
    });
    expect(payload.sku).toMatch(/^[A-Z2-9]{8}$/);
    expect(payload.categories).toEqual([
      expect.objectContaining({ super_category_name: '', category_name: '' }),
    ]);
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', notes: 'Partner product listing submitted' })
    );
    expect(pub.id).toBe('p1');
  });

  it('falls back to HOST for an unknown delivery target and keeps a numeric threshold', async () => {
    productModel.create.mockResolvedValue(productDoc());
    await inventoryService.submitProductListing(
      listingInput({ delivery_target: 'DRONE', free_delivery_above: 999 }),
      PARTNER
    );
    expect(productModel.create.mock.calls[0][0]).toMatchObject({
      delivery_target: 'HOST',
      free_delivery_above: 999,
    });
  });

  it('persists explicit category rows over the flat triple', async () => {
    productModel.create.mockResolvedValue(productDoc());
    await inventoryService.submitProductListing(
      listingInput({
        categories: [
          {
            super_category_id: SUPER_ID,
            category_id: CATEGORY_ID,
            sub_category_id: SUB_ID,
            super_category_name: 'Apparel',
            category_name: 'Tops',
            sub_category_name: 'Tees',
          },
          { super_category_id: SUPER_ID }, // incomplete row is dropped
        ],
      }),
      PARTNER
    );
    const payload = productModel.create.mock.calls[0][0];
    expect(payload.categories).toHaveLength(1);
    expect(payload.categories[0]).toMatchObject({
      super_category_name: 'Apparel',
      sub_category_name: 'Tees',
    });
  });

  it('stores no category row when the supplied triple is not made of object ids', async () => {
    productModel.create.mockResolvedValue(productDoc());
    await inventoryService.submitProductListing(
      listingInput({ super_category_id: 'apparel', category_id: 'tops', sub_category_id: 'tees' }),
      PARTNER
    );
    expect(productModel.create.mock.calls[0][0]).toMatchObject({
      categories: [],
      super_category_id: null,
      category_id: null,
      sub_category_id: null,
    });
  });

  it('writes the variant matrix and mirrors the first variant onto the product', async () => {
    const doc = productDoc();
    productModel.create.mockResolvedValue(doc);

    await inventoryService.submitProductListing(
      listingInput({
        options: [
          { name: 'Colour', values: ['Red', '  ', 'Blue'] },
          { name: '   ', values: ['ignored'] },
        ],
        variants: [
          {
            option_label: 'Red / S',
            option_values: [{ name: 'Colour', value: 'Red' }, {}],
            sku: 'red-s',
            color: 'Red',
            size_label: 'S',
            unit_cost: 300,
            inventory_count: 4,
            images: ['https://cdn.duncit.com/red.png', ''],
            height_cm: 2,
            breadth_cm: 3,
            length_cm: 4,
            weight_kg: 0.2,
          },
          { option_label: 'Blue / M', unit_cost: 350, inventory_count: 6 },
        ],
      }),
      PARTNER
    );

    expect(doc.options).toEqual([{ name: 'Colour', values: ['Red', 'Blue'] }]);
    expect(doc.variants).toHaveLength(2);
    expect(doc.variants[0]).toMatchObject({
      sku: 'RED-S',
      option_values: [{ name: 'Colour', value: 'Red' }],
      images: ['https://cdn.duncit.com/red.png'],
      view_count: 0,
      click_count: 0,
    });
    // A variant with no SKU gets a generated one.
    expect(doc.variants[1].sku).toMatch(/^[A-Z2-9]{8}$/);
    // Flat mirror = first variant; total stock = sum of the matrix.
    expect(doc.unit_cost).toBe(300);
    expect(doc.selling_price).toBe(300);
    expect(doc.inventory_count).toBe(10);
    expect(doc.image_url).toBe('https://cdn.duncit.com/red.png');
    expect(doc.save).toHaveBeenCalled();
  });

  it('gives up after ten SKU collisions rather than looping forever', async () => {
    productModel.exists.mockResolvedValue({ _id: 'clash' });
    await expect(inventoryService.submitProductListing(listingInput(), PARTNER)).rejects.toThrow(
      'Could not generate a unique SKU, please retry'
    );
    expect(productModel.exists).toHaveBeenCalledTimes(10);
  });

  it('generates a fresh SKU on demand', async () => {
    const sku = await inventoryService.generateSku();
    expect(sku).toMatch(/^[A-Z2-9]{8}$/);
  });
});

describe('partner warehouse rules', () => {
  it('rejects a warehouse id that is not a valid object id', async () => {
    await expect(
      inventoryService.submitProductListing(listingInput({ pickup_location_id: 'nope' }), PARTNER)
    ).rejects.toThrow('Select a valid warehouse');
  });

  it("rejects a warehouse that belongs to another brand", async () => {
    warehouseModel.findById.mockReturnValue(
      query({ owner_kind: 'BRAND', brand_id: '65c0000000000000000000ff', review_status: 'APPROVED' })
    );
    await expect(
      inventoryService.submitProductListing(
        listingInput({ pickup_location_id: WAREHOUSE_ID }),
        PARTNER
      )
    ).rejects.toThrow('Select a warehouse that belongs to this brand');
  });

  it('rejects a warehouse row that carries no brand at all', async () => {
    warehouseModel.findById.mockReturnValue(query({ owner_kind: 'BRAND' }));
    await expect(
      inventoryService.submitProductListing(
        listingInput({ pickup_location_id: WAREHOUSE_ID }),
        PARTNER
      )
    ).rejects.toThrow('Select a warehouse that belongs to this brand');
  });

  it('rejects a same-brand warehouse that is still awaiting approval', async () => {
    warehouseModel.findById.mockReturnValue(
      query({ owner_kind: 'BRAND', brand_id: BRAND_ID, review_status: 'PENDING' })
    );
    await expect(
      inventoryService.submitProductListing(
        listingInput({ pickup_location_id: WAREHOUSE_ID }),
        PARTNER
      )
    ).rejects.toThrow('awaiting approval');
  });

  it('accepts an approved warehouse of the listing brand', async () => {
    warehouseModel.findById.mockReturnValue(
      query({ owner_kind: 'BRAND', brand_id: BRAND_ID, review_status: 'APPROVED' })
    );
    productModel.create.mockResolvedValue(productDoc());
    await inventoryService.submitProductListing(
      listingInput({ pickup_location_id: WAREHOUSE_ID }),
      PARTNER
    );
    expect(String(productModel.create.mock.calls[0][0].pickup_location_id)).toBe(WAREHOUSE_ID);
  });
});

describe('inventoryService.updateMyProductListing', () => {
  it('sends an edited listing back to review and keeps it unpublished', async () => {
    const doc = productDoc({ is_active: true, status: 'ACTIVE', inventory_count: 12 });
    productModel.findOne.mockResolvedValue(doc);

    const pub = await inventoryService.updateMyProductListing(
      'p1',
      listingInput({ inventory_count: 20, unit_cost: 550 }),
      PARTNER
    );

    expect(productModel.findOne).toHaveBeenCalledWith({
      _id: 'p1',
      listing_submitted_by_id: PARTNER.id,
    });
    expect(doc).toMatchObject({
      listing_review_status: 'PENDING',
      listing_review_notes: '',
      status: 'DRAFT',
      visibility: 'INTERNAL',
      is_active: false,
      pod_available: false,
      host_request_allowed: false,
      inventory_count: 20,
      unit_cost: 550,
      last_updated_by_id: PARTNER.id,
    });
    expect(pub.inventory_count).toBe(20);
    // The stock change is journalled as an ADJUST movement.
    expect(movementModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ADJUST', quantity: 8, reason: 'Direct edit' })
    );
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        changed_fields: expect.arrayContaining(['inventory_count']),
      })
    );
  });

  it('leaves the existing categories alone when the edit carries no valid triple', async () => {
    const existing = [{ super_category_name: 'Apparel' }];
    const doc = productDoc({ categories: existing, images: undefined });
    productModel.findOne.mockResolvedValue(doc);

    await inventoryService.updateMyProductListing(
      'p1',
      listingInput({
        super_category_id: 'apparel',
        category_id: 'tops',
        sub_category_id: 'tees',
        images: undefined,
      }),
      PARTNER
    );

    expect(doc.categories).toBe(existing);
    // The single image_url still becomes the listing's image set.
    expect(doc.images).toEqual(['https://cdn.duncit.com/tee.png']);
  });

  it("refuses to edit a listing the caller does not own", async () => {
    productModel.findOne.mockResolvedValue(null);
    await expect(
      inventoryService.updateMyProductListing('p1', listingInput(), PARTNER)
    ).rejects.toThrow('Product listing not found');
  });

  it('keeps an existing variant id, sku and counters across an edit', async () => {
    const doc = productDoc({
      variants: [
        {
          _id: 'v-existing',
          sku: 'KEEPME1',
          option_label: 'Red / S',
          option_values: [{ name: 'Colour', value: 'Red' }],
          view_count: 7,
          click_count: 3,
        },
      ],
    });
    productModel.findOne.mockResolvedValue(doc);

    await inventoryService.updateMyProductListing(
      'p1',
      listingInput({
        variants: [
          {
            option_label: 'Red / S',
            option_values: [{ name: 'Colour', value: 'Red' }],
            unit_cost: 400,
            inventory_count: 9,
          },
        ],
      }),
      PARTNER
    );

    expect(doc.variants[0]).toMatchObject({
      _id: 'v-existing',
      sku: 'KEEPME1',
      view_count: 7,
      click_count: 3,
      unit_cost: 400,
    });
  });
});

describe('inventoryService.updateMyProductListingQuantity', () => {
  it.each([
    ['a fractional quantity', 2.5],
    ['a negative quantity', -1],
  ])('rejects %s', async (_case, value) => {
    await expect(
      inventoryService.updateMyProductListingQuantity('p1', value, PARTNER)
    ).rejects.toThrow('Quantity must be a whole number');
    expect(productModel.findOne).not.toHaveBeenCalled();
  });

  it('refuses to drop below the units already committed to buyers', async () => {
    productModel.findOne.mockResolvedValue(productDoc({ requested_count: 4, reserved_count: 3 }));
    await expect(
      inventoryService.updateMyProductListingQuantity('p1', 5, PARTNER)
    ).rejects.toThrow('Quantity cannot be less than 7 committed units');
  });

  it('records the movement and notifies the owner when stock crosses the low-stock line', async () => {
    const doc = productDoc({
      inventory_count: 12,
      requested_count: 0,
      notify_low_stock: true,
      low_stock_alert: 5,
    });
    productModel.findOne.mockResolvedValue(doc);

    const pub = await inventoryService.updateMyProductListingQuantity('p1', 4, PARTNER);

    expect(pub.inventory_count).toBe(4);
    expect(movementModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ADJUST', quantity: -8, balance_after: 4 })
    );
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'USER',
        target_user_ids: [PARTNER.id],
        title: 'Low stock alert',
        body: 'Duncit Tee is low on stock — 4 left (alert at 5).',
      })
    );
  });

  it('stays silent while stock remains above the threshold', async () => {
    productModel.findOne.mockResolvedValue(
      productDoc({ inventory_count: 12, notify_low_stock: true, low_stock_alert: 5 })
    );
    await inventoryService.updateMyProductListingQuantity('p1', 9, PARTNER);
    expect(notifyCreate).not.toHaveBeenCalled();
  });

  it('stays silent when the owner has not opted in to low-stock alerts', async () => {
    productModel.findOne.mockResolvedValue(
      productDoc({ inventory_count: 12, notify_low_stock: false, low_stock_alert: 5 })
    );
    await inventoryService.updateMyProductListingQuantity('p1', 1, PARTNER);
    expect(notifyCreate).not.toHaveBeenCalled();
  });

  it('logs, but does not fail the stock update, when the notification cannot be sent', async () => {
    notifyCreate.mockRejectedValue(new Error('push down'));
    productModel.findOne.mockResolvedValue(
      productDoc({ inventory_count: 12, notify_low_stock: true, low_stock_alert: 5 })
    );

    await expect(
      inventoryService.updateMyProductListingQuantity('p1', 2, PARTNER)
    ).resolves.toMatchObject({ inventory_count: 2 });
    expect(logs.server.error).toHaveBeenCalledWith(
      'inventory',
      'notifyLowStockIfCrossed',
      expect.objectContaining({ msg: 'low-stock notify failed' })
    );
  });
});

describe('inventoryService.updateMyProductSettings', () => {
  it('rejects a non-integer low-stock threshold', async () => {
    await expect(
      inventoryService.updateMyProductSettings('p1', 1.5, true, PARTNER)
    ).rejects.toThrow('Low-stock threshold must be a whole number');
  });

  it('updates the threshold and toggle without re-triggering approval', async () => {
    const doc = productDoc({ listing_review_status: 'APPROVED', low_stock_alert: 5 });
    productModel.findOne.mockResolvedValue(doc);

    const pub = await inventoryService.updateMyProductSettings('p1', 3, true, PARTNER);

    expect(doc.low_stock_alert).toBe(3);
    expect(doc.notify_low_stock).toBe(true);
    expect(doc.listing_review_status).toBe('APPROVED');
    expect(pub.notify_low_stock).toBe(true);
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'Product settings updated' })
    );
  });
});

describe('inventoryService.deleteMyProductListing', () => {
  it('archives the listing and pulls it out of every pod surface', async () => {
    const doc = productDoc({ is_active: true, pod_available: true, host_request_allowed: true });
    productModel.findOne.mockResolvedValue(doc);

    await expect(inventoryService.deleteMyProductListing('p1', PARTNER)).resolves.toBe(true);

    expect(doc).toMatchObject({
      is_active: false,
      status: 'ARCHIVED',
      pod_available: false,
      host_request_allowed: false,
    });
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', notes: 'Partner listing deleted' })
    );
  });
});

describe('inventoryService.reviewProductListing', () => {
  it.each([['PENDING'], ['MAYBE']])('rejects the decision %s', async (status) => {
    await expect(
      inventoryService.reviewProductListing('p1', status, null, REVIEWER)
    ).rejects.toThrow('Review decision must be APPROVED or DENIED');
  });

  it('404s on a product that does not exist', async () => {
    productModel.findById.mockResolvedValue(null);
    await expect(
      inventoryService.reviewProductListing('p1', 'APPROVED', null, REVIEWER)
    ).rejects.toThrow('Product listing request not found');
  });

  it('refuses to review a Duncit catalogue product', async () => {
    productModel.findById.mockResolvedValue(productDoc({ listing_submitted_by_id: null }));
    await expect(
      inventoryService.reviewProductListing('p1', 'APPROVED', null, REVIEWER)
    ).rejects.toThrow('This product is not a partner listing');
  });

  it.each([
    ['below the floor', 4],
    ['above the ceiling', 51],
    ['not a number', Number.NaN],
  ])('rejects a commission override %s', async (_case, commission) => {
    productModel.findById.mockResolvedValue(productDoc());
    await expect(
      inventoryService.reviewProductListing('p1', 'APPROVED', null, REVIEWER, commission)
    ).rejects.toThrow('Commission must be between 5% and 50%');
  });

  it('publishes an approved listing, applies the commission and tells the partner', async () => {
    const doc = productDoc({ is_active: false, status: 'DRAFT' });
    productModel.findById.mockResolvedValue(doc);

    const pub = await inventoryService.reviewProductListing('p1', 'APPROVED', '  ', REVIEWER, 12);

    expect(doc).toMatchObject({
      commission_pct: 12,
      listing_review_status: 'APPROVED',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      is_active: true,
      pod_available: true,
      host_request_allowed: true,
      listing_reviewed_by_id: REVIEWER.id,
    });
    expect(pub.listing_review_status).toBe('APPROVED');
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORE' })
    );
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Product approved 🎉',
        body: 'Duncit Tee is approved and can now be stocked into pods.',
      })
    );
  });

  it('unpublishes a denied listing and passes the reason on to the partner', async () => {
    const doc = productDoc({ is_active: true, status: 'ACTIVE' });
    productModel.findById.mockResolvedValue(doc);

    await inventoryService.reviewProductListing('p1', 'DENIED', '  images are blurry  ', REVIEWER);

    expect(doc).toMatchObject({
      listing_review_status: 'DENIED',
      status: 'ARCHIVED',
      visibility: 'INTERNAL',
      is_active: false,
      listing_review_notes: 'images are blurry',
    });
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ARCHIVE' })
    );
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Product listing declined',
        body: 'Duncit Tee was declined — images are blurry',
      })
    );
  });

  it('ends the decline message with a full stop when no reason was given', async () => {
    productModel.findById.mockResolvedValue(productDoc());
    await inventoryService.reviewProductListing('p1', 'DENIED', null, REVIEWER);
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Duncit Tee was declined.' })
    );
  });

  it('logs, but still returns the decision, when the partner cannot be notified', async () => {
    notifyCreate.mockRejectedValue(new Error('push down'));
    productModel.findById.mockResolvedValue(productDoc());

    await expect(
      inventoryService.reviewProductListing('p1', 'APPROVED', null, REVIEWER)
    ).resolves.toMatchObject({ listing_review_status: 'APPROVED' });
    expect(logs.server.error).toHaveBeenCalledWith(
      'inventory',
      'reviewProductListing',
      expect.objectContaining({ msg: 'review notify failed' })
    );
  });
});

describe('inventoryService.myProductAnalytics', () => {
  it('aggregates orders, locations and per-variant views/clicks for an owned listing', async () => {
    const doc = productDoc({
      commission_pct: 20,
      view_count: 40,
      click_count: 9,
      variants: [{ _id: 'v1', option_label: 'Red / S', view_count: 25, click_count: 6 }],
    });
    productModel.findOne.mockResolvedValue(doc);
    orderModel.find.mockReturnValue(
      query([
        {
          shipping_address: { city: 'Pune' },
          line_items: [
            { product_id: 'p1', qty: 2, gross: 1000, variant_id: 'v1', variant_label: 'Red / S' },
            { product_id: 'other', qty: 5, gross: 9999 },
          ],
        },
        {
          shipping_address: { state: 'Goa' },
          line_items: [{ product_id: 'p1', qty: 1, gross: 500, variant_id: 'v1' }],
        },
        { shipping_address: {}, line_items: [{ product_id: 'other', qty: 3, gross: 1 }] },
      ])
    );
    podModel.countDocuments.mockResolvedValue(4);

    const stats = await inventoryService.myProductAnalytics('p1', PARTNER);

    expect(stats).toMatchObject({
      product_id: 'p1',
      total_views: 40,
      total_clicks: 9,
      orders: 2,
      units_sold: 3,
      gross_revenue: 1500,
      total_earning: 1200,
      currency_symbol: '₹',
      linked_pods: 4,
    });
    expect(stats.locations).toEqual([
      { location: 'Pune', units_sold: 2, orders: 1 },
      { location: 'Goa', units_sold: 1, orders: 1 },
    ]);
    expect(stats.variants).toEqual([
      { variant_id: 'v1', variant_label: 'Red / S', units_sold: 3, orders: 2, views: 25, clicks: 6 },
    ]);
  });

  it('falls back to Unknown for an order with no city or state, and to a Default variant', async () => {
    const doc = productDoc({
      commission_pct: 0,
      variants: [{ _id: 'v9', option_label: '', view_count: 0, click_count: 0 }],
    });
    productModel.findOne.mockResolvedValue(doc);
    orderModel.find.mockReturnValue(
      query([{ shipping_address: null, line_items: [{ product_id: 'p1', qty: 1, gross: 250 }] }])
    );
    podModel.countDocuments.mockResolvedValue(0);

    const stats = await inventoryService.myProductAnalytics('p1', PARTNER);

    expect(stats.locations).toEqual([{ location: 'Unknown', units_sold: 1, orders: 1 }]);
    expect(stats.total_earning).toBe(250);
    expect(stats.variants).toEqual(
      expect.arrayContaining([expect.objectContaining({ variant_label: 'Default' })])
    );
  });
});
