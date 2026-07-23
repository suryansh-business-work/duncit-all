import { Types } from 'mongoose';
import { inventoryService } from '../../inventory.service';
import { InventoryProductModel } from '../../inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { UserModel } from '@modules/access/user/user.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';

describe('inventoryService integration', () => {
  it('lists no products / requests on an empty dataset', async () => {
    expect(await inventoryService.list()).toEqual([]);
    expect(await inventoryService.listProductRequests()).toEqual([]);
    expect(await inventoryService.listAvailablePodProducts()).toEqual([]);
  });

  it('reads a single product by id with its public detail fields (powers publicInventoryProduct)', async () => {
    const id = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: id,
      product_name: 'Drum sticks',
      brand_name: 'Vic Firth',
      description: 'Maple 5A drumsticks for practice and stage',
      images: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
    } as never);

    const pub = await inventoryService.getById(String(id));
    expect(pub?.product_name).toBe('Drum sticks');
    expect(pub?.brand_name).toBe('Vic Firth');
    expect(pub?.description).toContain('Maple');
    expect(pub?.images).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);

    // A missing id resolves to null (dialog shows nothing rather than crashing).
    expect(await inventoryService.getById(new Types.ObjectId().toString())).toBeNull();
  });

  it('generates a unique SKU', async () => {
    const sku = await inventoryService.generateSku();
    expect(typeof sku).toBe('string');
    expect(sku.length).toBeGreaterThan(0);
  });

  it('exposes per-variant price/stock/images on the product detail', async () => {
    const id = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: id,
      product_name: 'Tee',
      sku: 'TEE1',
      unit_cost: 10,
      variants: [
        { _id: new Types.ObjectId(), option_label: 'Red / M', sku: 'TEE1-RM', color: 'Red', size_label: 'M', unit_cost: 12, inventory_count: 5, images: ['https://cdn/r.jpg'], height_cm: 1, breadth_cm: 1, length_cm: 1, weight_kg: 0.2 },
        { _id: new Types.ObjectId(), option_label: 'Blue / L', sku: 'TEE1-BL', color: 'Blue', size_label: 'L', unit_cost: 14, inventory_count: 3, images: [], height_cm: 0, breadth_cm: 0, length_cm: 0, weight_kg: 0 },
      ],
    } as never);
    const pub = await inventoryService.getById(String(id));
    expect(pub?.variants).toHaveLength(2);
    expect(pub?.variants?.[0]).toMatchObject({ option_label: 'Red / M', color: 'Red', unit_cost: 12, inventory_count: 5 });
    expect(pub?.variants?.[0].images).toEqual(['https://cdn/r.jpg']);
    expect(pub?.variants?.[1].images).toEqual([]);
  });

  it('serializes product options + per-variant option values (the variant matrix)', async () => {
    const id = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: id,
      product_name: 'Option Tee',
      sku: 'OPT1',
      unit_cost: 10,
      options: [
        { name: 'Size', values: ['S', 'M'] },
        { name: 'Colour', values: ['Red'] },
      ],
      variants: [
        {
          _id: new Types.ObjectId(),
          option_label: 'M / Red',
          option_values: [
            { name: 'Size', value: 'M' },
            { name: 'Colour', value: 'Red' },
          ],
          sku: 'OPT1-MR',
          unit_cost: 12,
          inventory_count: 4,
          images: [],
        },
      ],
    } as never);
    const pub = await inventoryService.getById(String(id));
    expect(pub?.options).toEqual([
      { name: 'Size', values: ['S', 'M'] },
      { name: 'Colour', values: ['Red'] },
    ]);
    expect(pub?.variants?.[0].option_values).toEqual([
      { name: 'Size', value: 'M' },
      { name: 'Colour', value: 'Red' },
    ]);
  });

  it('serializes category rows + per-variant description and filters pod products by category', async () => {
    const superId = new Types.ObjectId();
    const catId = new Types.ObjectId();
    const subId = new Types.ObjectId();
    const otherSub = new Types.ObjectId();
    const approved = { is_active: true, status: 'ACTIVE', pod_available: true, listing_review_status: 'APPROVED' };

    const matchId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: matchId,
      product_name: 'Matching kit',
      sku: 'MATCH1',
      unit_cost: 100,
      inventory_count: 5,
      super_category_id: superId,
      category_id: catId,
      sub_category_id: subId,
      categories: [
        { super_category_id: superId, category_id: catId, sub_category_id: subId, super_category_name: 'S', category_name: 'C', sub_category_name: 'Cold brew' },
      ],
      variants: [
        { _id: new Types.ObjectId(), option_label: 'Default', sku: 'MATCH1-D', color: 'Black', size_label: 'M', description: 'Full per-variant description text', unit_cost: 100, inventory_count: 5, images: ['https://cdn/m.jpg'], height_cm: 10, breadth_cm: 5, length_cm: 8, weight_kg: 1 },
      ],
      ...approved,
    } as never);
    await InventoryProductModel.collection.insertOne({
      _id: new Types.ObjectId(),
      product_name: 'Other kit',
      sku: 'OTHER1',
      unit_cost: 100,
      inventory_count: 5,
      super_category_id: superId,
      category_id: catId,
      sub_category_id: otherSub,
      ...approved,
    } as never);

    // The category filter surfaces only the exactly-matching product.
    const matched = await inventoryService.listAvailablePodProducts({
      super_category_id: String(superId),
      category_id: String(catId),
      sub_category_id: String(subId),
    });
    expect(matched.map((p) => p.product_name)).toEqual(['Matching kit']);

    // Pub shape carries the new category rows + per-variant description.
    const pub = await inventoryService.getById(String(matchId));
    expect(pub?.categories?.[0]).toMatchObject({
      super_category_id: String(superId),
      sub_category_id: String(subId),
      sub_category_name: 'Cold brew',
    });
    expect(pub?.variants?.[0].description).toBe('Full per-variant description text');
  });

  it('updateMyProductSettings persists the low-stock threshold + notify flag without re-review', async () => {
    const userId = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      auth: { email: 'seller@example.com' },
      metadata: { role_keys: ['ECOMM_MANAGER'], status: 'ACTIVE' },
    } as never);
    const productId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: productId,
      product_name: 'Threshold kit',
      sku: 'THR-1',
      unit_cost: 10,
      inventory_count: 20,
      low_stock_alert: 5,
      notify_low_stock: false,
      listing_submitted_by_id: String(userId),
      listing_review_status: 'APPROVED',
    } as never);

    const updated = await inventoryService.updateMyProductSettings(String(productId), 8, true, {
      id: String(userId),
      email: 'seller@example.com',
    } as never);
    expect(updated.low_stock_alert).toBe(8);
    expect(updated.notify_low_stock).toBe(true);
    // Settings changes must NOT push the listing back into review.
    expect(updated.listing_review_status).toBe('APPROVED');
  });

  it('myProductAnalytics aggregates orders/units/earnings + records views and clicks', async () => {
    const owner = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: owner,
      auth: { email: 'analytics@example.com' },
      metadata: { role_keys: ['ECOMM_MANAGER'], status: 'ACTIVE' },
    } as never);
    const productId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: productId,
      product_name: 'Analytics Kit',
      sku: 'AN-1',
      unit_cost: 100,
      commission_pct: 10,
      listing_submitted_by_id: String(owner),
      listing_review_status: 'APPROVED',
      variants: [{ _id: variantId, option_label: 'M', unit_cost: 100, inventory_count: 5, images: [] }],
      view_count: 0,
      click_count: 0,
    } as never);
    await ProductOrderModel.collection.insertOne({
      order_no: 'ord-an-1',
      buyer_id: new Types.ObjectId(),
      payment_id: new Types.ObjectId(),
      items_total: 200,
      total: 200,
      fulfilment_method: 'SHIP',
      line_items: [
        { product_id: productId, variant_id: String(variantId), variant_label: 'M', qty: 2, unit_cost: 100, gross: 200 },
      ],
      shipping_address: { city: 'Pune' },
    } as never);

    const user = { id: String(owner), email: 'analytics@example.com' } as never;
    await inventoryService.recordProductView(String(productId));
    await inventoryService.recordProductClick(String(productId), String(variantId));

    const analytics = await inventoryService.myProductAnalytics(String(productId), user);
    expect(analytics.orders).toBe(1);
    expect(analytics.units_sold).toBe(2);
    expect(analytics.gross_revenue).toBe(200);
    // 200 gross, 10% Duncit commission → 180 net.
    expect(analytics.total_earning).toBe(180);
    expect(analytics.total_views).toBe(1);
    expect(analytics.total_clicks).toBe(1);
    expect(analytics.locations).toEqual([{ location: 'Pune', units_sold: 2, orders: 1 }]);
    const variantStat = analytics.variants.find((v: any) => v.variant_id === String(variantId));
    expect(variantStat).toMatchObject({ units_sold: 2, orders: 1, clicks: 1 });
  });
});

describe('inventory table queries (shared table engine)', () => {
  it('serves the inventoryProductsTable page with search, filters, sort and paging', async () => {
    await InventoryProductModel.create({ product_name: 'Alpha Mat', sku: 'ALPHA1', unit_cost: 10, brand_name: 'Zen', status: 'ACTIVE', selling_price: 100, ownership: 'DUNCIT' });
    await InventoryProductModel.create({ product_name: 'Beta Ball', sku: 'BETA1', unit_cost: 10, brand_name: 'Kick', status: 'DRAFT', selling_price: 50, ownership: 'DUNCIT' });
    await InventoryProductModel.create({ product_name: 'Gamma Glove', sku: 'GAMMA1', unit_cost: 10, brand_name: 'Kick', status: 'ACTIVE', selling_price: 75, ownership: 'BRAND' });

    // Plain envelope with the default sort (product_name asc) and clamp defaults.
    const all = await inventoryService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((p) => p.product_name)).toEqual(['Alpha Mat', 'Beta Ball', 'Gamma Glove']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans sku and brand_name.
    const bySku = await inventoryService.table({ search: 'beta1' });
    expect(bySku.rows.map((p) => p.product_name)).toEqual(['Beta Ball']);
    const byBrand = await inventoryService.table({ search: 'kick' });
    expect(byBrand.total).toBe(2);

    // Enum filters narrow (the old UI's status select + hardcoded ownership).
    const active = await inventoryService.table({
      filters: [{ field: 'status', op: 'eq', value: 'ACTIVE' }],
    });
    expect(active.rows.map((p) => p.product_name)).toEqual(['Alpha Mat', 'Gamma Glove']);
    const duncit = await inventoryService.table({
      filters: [{ field: 'ownership', op: 'eq', value: 'DUNCIT' }],
    });
    expect(duncit.total).toBe(2);

    // Allowlisted numeric sort.
    const priced = await inventoryService.table({ sort_by: 'selling_price', sort_dir: 'desc' });
    expect(priced.rows.map((p) => p.product_name)).toEqual(['Alpha Mat', 'Gamma Glove', 'Beta Ball']);

    // Paging keeps total and echoes the clamped page/page_size.
    const page2 = await inventoryService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((p) => p.product_name)).toEqual(['Beta Ball']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('scopes marketplaceBrandProductsTable to one approved, active brand', async () => {
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Mine Co', status: 'APPROVED', is_active: true });
    const other = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'Other Co', status: 'APPROVED', is_active: true });
    await InventoryProductModel.create({ product_name: 'Mine Approved', sku: 'MBA1', unit_cost: 5, brand_id: brand._id, ownership: 'BRAND', listing_review_status: 'APPROVED' });
    await InventoryProductModel.create({ product_name: 'Mine Pending', sku: 'MBP1', unit_cost: 5, brand_id: brand._id, ownership: 'BRAND', listing_review_status: 'PENDING' });
    await InventoryProductModel.create({ product_name: 'Other Approved', sku: 'MBO1', unit_cost: 5, brand_id: other._id, ownership: 'BRAND', listing_review_status: 'APPROVED' });

    const page = await inventoryService.marketplaceBrandProductsTable(String(brand._id));
    expect(page.rows.map((p) => p.product_name)).toEqual(['Mine Approved']);
    expect(page.total).toBe(1);

    // A deactivated brand's storefront is empty (mirrors listMarketplaceBrandProducts).
    await EcommBrandModel.updateOne({ _id: brand._id }, { is_active: false });
    const hidden = await inventoryService.marketplaceBrandProductsTable(String(brand._id));
    expect(hidden.rows).toEqual([]);
    expect(hidden.total).toBe(0);

    // An invalid brand id yields an empty page rather than an error.
    const invalid = await inventoryService.marketplaceBrandProductsTable('not-an-id');
    expect(invalid.total).toBe(0);
  });

  it('productListingRequestsTable only shows partner submissions and filters by review status', async () => {
    await InventoryProductModel.create({ product_name: 'Sub Pending', sku: 'PLR1', unit_cost: 5, listing_submitted_by_id: 'u1', listing_submitted_by_name: 'Uma Seller', listing_review_status: 'PENDING' });
    await InventoryProductModel.create({ product_name: 'Sub Approved', sku: 'PLR2', unit_cost: 5, listing_submitted_by_id: 'u2', listing_submitted_by_name: 'Vik Seller', listing_review_status: 'APPROVED' });
    // Catalogue product with no submitter — never a review-inbox row.
    await InventoryProductModel.create({ product_name: 'Catalogue', sku: 'PLR3', unit_cost: 5 });

    const all = await inventoryService.productListingRequestsTable();
    expect(all.total).toBe(2);
    expect(all.rows.map((p) => p.product_name).sort((a, b) => a.localeCompare(b))).toEqual([
      'Sub Approved',
      'Sub Pending',
    ]);

    // The old UI's status toggle becomes a listing_review_status filter.
    const pending = await inventoryService.productListingRequestsTable({
      filters: [{ field: 'listing_review_status', op: 'eq', value: 'PENDING' }],
    });
    expect(pending.rows.map((p) => p.product_name)).toEqual(['Sub Pending']);

    // Search matches the submitter's name.
    const byName = await inventoryService.productListingRequestsTable({ search: 'uma' });
    expect(byName.rows.map((p) => p.product_name)).toEqual(['Sub Pending']);
  });

  it('myProductListingsTable serves ONLY the caller\'s listings (ownership scope)', async () => {
    const userA = { id: new Types.ObjectId().toString(), roles: ['ECOMM_MANAGER'] };
    const userB = { id: new Types.ObjectId().toString(), roles: ['ECOMM_MANAGER'] };
    const brandA = new Types.ObjectId();
    await InventoryProductModel.create({ product_name: 'A Red Cap', sku: 'MYA1', unit_cost: 5, selling_price: 20, inventory_count: 3, color: 'red', listing_submitted_by_id: userA.id, listing_review_status: 'APPROVED', brand_id: brandA });
    await InventoryProductModel.create({ product_name: 'A Blue Mug', sku: 'MYA2', unit_cost: 5, selling_price: 10, inventory_count: 7, color: 'blue', listing_submitted_by_id: userA.id, listing_review_status: 'PENDING' });
    await InventoryProductModel.create({ product_name: 'B Green Tee', sku: 'MYB1', unit_cost: 5, selling_price: 30, inventory_count: 1, color: 'green', listing_submitted_by_id: userB.id, listing_review_status: 'APPROVED' });

    // Default sort = updated_at desc (newest listing first).
    const mine = await inventoryService.myProductListingsTable(userA);
    expect(mine.total).toBe(2);
    expect(mine.rows.map((p) => p.product_name)).toEqual(['A Blue Mug', 'A Red Cap']);

    // User B only ever sees their own row.
    const theirs = await inventoryService.myProductListingsTable(userB);
    expect(theirs.rows.map((p) => p.product_name)).toEqual(['B Green Tee']);

    // A scope-breaking filter on a non-allowlisted field is silently dropped —
    // user A can NEVER pull user B's listings through the table query.
    const hostile = await inventoryService.myProductListingsTable(userA, null, {
      filters: [{ field: 'listing_submitted_by_id', op: 'eq', value: userB.id }],
    });
    expect(hostile.total).toBe(2);
    expect(hostile.rows.every((p) => p.listing_submitted_by_id === userA.id)).toBe(true);

    // Search spans the old client-side fields (color here).
    const red = await inventoryService.myProductListingsTable(userA, null, { search: 'red' });
    expect(red.rows.map((p) => p.product_name)).toEqual(['A Red Cap']);

    // Status filter + allowlisted sort + paging, still inside the owner scope.
    const approved = await inventoryService.myProductListingsTable(userA, null, {
      filters: [{ field: 'listing_review_status', op: 'eq', value: 'APPROVED' }],
    });
    expect(approved.rows.map((p) => p.product_name)).toEqual(['A Red Cap']);
    const cheapFirst = await inventoryService.myProductListingsTable(userA, null, {
      sort_by: 'selling_price',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(cheapFirst.rows.map((p) => p.product_name)).toEqual(['A Red Cap']);
    expect(cheapFirst.total).toBe(2);
    expect(cheapFirst.page).toBe(2);
    expect(cheapFirst.page_size).toBe(1);

    // The brand_id arg narrows exactly like the sibling myProductListings query.
    const brandScoped = await inventoryService.myProductListingsTable(userA, String(brandA));
    expect(brandScoped.rows.map((p) => p.product_name)).toEqual(['A Red Cap']);

    // Unauthenticated callers are rejected like listMyProductListings.
    await expect(inventoryService.myProductListingsTable(null)).rejects.toThrow(/authentication/i);
  });
});

describe('partner listing warehouse + free-delivery threshold', () => {
  const seedManager = async () => {
    const userId = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      auth: { email: 'lister@example.com' },
      metadata: { role_keys: ['ECOMM_MANAGER'], status: 'ACTIVE' },
    } as never);
    return { id: String(userId), email: 'lister@example.com' } as never;
  };

  const listingInput = (brandId: unknown, over: Record<string, unknown> = {}) => ({
    brand_id: String(brandId),
    super_category_id: String(new Types.ObjectId()),
    category_id: String(new Types.ObjectId()),
    sub_category_id: String(new Types.ObjectId()),
    product_name: 'Listing Kit',
    image_url: 'https://cdn.example.com/listing.jpg',
    description: 'A perfectly valid product description text',
    inventory_count: 5,
    unit_cost: 100,
    commission_pct: 10,
    delivery_target: 'SHIPROCKET',
    ...over,
  });

  it('rejects a warehouse that does not belong to the listing brand', async () => {
    const user = await seedManager();
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'List Co' });
    // Another brand's warehouse.
    const foreignWh = await BrandPickupLocationModel.create({
      owner_kind: 'BRAND',
      brand_id: new Types.ObjectId(),
      nickname: 'LIST-FOREIGN-WH',
    });
    await expect(
      inventoryService.submitProductListing(listingInput(brand._id, { pickup_location_id: String(foreignWh._id) }), user)
    ).rejects.toThrow(/belongs to this brand/i);
    // A Duncit warehouse is not a brand origin either.
    const duncitWh = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'LIST-DUN-WH' });
    await expect(
      inventoryService.submitProductListing(listingInput(brand._id, { pickup_location_id: String(duncitWh._id) }), user)
    ).rejects.toThrow(/belongs to this brand/i);
    // A malformed id is rejected up front.
    await expect(
      inventoryService.submitProductListing(listingInput(brand._id, { pickup_location_id: 'nope' }), user)
    ).rejects.toThrow(/valid warehouse/i);
  });

  it('persists a same-brand warehouse + free-delivery threshold and round-trips them', async () => {
    const user = await seedManager();
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'List Co 2' });
    const wh = await BrandPickupLocationModel.create({
      owner_kind: 'BRAND',
      brand_id: brand._id,
      nickname: 'LIST-OWN-WH',
    });
    const created = await inventoryService.submitProductListing(
      listingInput(brand._id, { pickup_location_id: String(wh._id), free_delivery_above: 499 }),
      user
    );
    expect(created.pickup_location_id).toBe(String(wh._id));
    expect(created.free_delivery_above).toBe(499);

    // An edit can clear the threshold (null = no offer) and keeps the warehouse.
    const updated = await inventoryService.updateMyProductListing(
      created.id,
      listingInput(brand._id, { pickup_location_id: String(wh._id), free_delivery_above: null }),
      user
    );
    expect(updated.free_delivery_above).toBeNull();
    expect(updated.pickup_location_id).toBe(String(wh._id));
  });

  it('omitting the warehouse keeps the listing unassigned and validates the threshold', async () => {
    const user = await seedManager();
    const brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: 'List Co 3' });
    await expect(
      inventoryService.submitProductListing(listingInput(brand._id, { free_delivery_above: -5 }), user)
    ).rejects.toThrow(/cannot be negative/i);
    await expect(
      inventoryService.submitProductListing(listingInput(brand._id, { free_delivery_above: 'abc' }), user)
    ).rejects.toThrow(/cannot be negative/i);

    const created = await inventoryService.submitProductListing(listingInput(brand._id), user);
    expect(created.pickup_location_id).toBeNull();
    expect(created.free_delivery_above).toBeNull();
  });
});

describe('inventoryService Duncit warehouse guard', () => {
  const admin = { id: new Types.ObjectId().toString(), email: 'admin@duncit.com' } as never;

  it('requires a valid Duncit warehouse to create a product and round-trips it', async () => {
    // Missing warehouse → hard error (the field is mandatory for Duncit products).
    await expect(
      inventoryService.create({ product_name: 'No WH', unit_cost: 5 }, admin),
    ).rejects.toThrow(/warehouse/i);

    // A BRAND-owned warehouse is not a valid origin for a Duncit product.
    const brandWh = await BrandPickupLocationModel.create({ owner_kind: 'BRAND', nickname: 'BR-WH' });
    await expect(
      inventoryService.create(
        { product_name: 'Brand WH', unit_cost: 5, pickup_location_id: String(brandWh._id) },
        admin,
      ),
    ).rejects.toThrow(/valid Duncit warehouse/i);

    // A valid Duncit warehouse succeeds and serializes onto the public shape.
    const duncitWh = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'DUN-WH' });
    const created = await inventoryService.create(
      { product_name: 'Good WH', unit_cost: 5, pickup_location_id: String(duncitWh._id) },
      admin,
    );
    expect(created.pickup_location_id).toBe(String(duncitWh._id));
  });

  it('keeps a valid warehouse on update and rejects clearing it for a Duncit product', async () => {
    const duncitWh = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'DUN-UPD' });
    const created = await inventoryService.create(
      { product_name: 'Editable', unit_cost: 5, pickup_location_id: String(duncitWh._id) },
      admin,
    );
    const renamed = await inventoryService.update(
      created.id,
      { product_name: 'Editable 2', pickup_location_id: String(duncitWh._id) },
      admin,
    );
    expect(renamed.product_name).toBe('Editable 2');
    expect(renamed.pickup_location_id).toBe(String(duncitWh._id));

    await expect(
      inventoryService.update(created.id, { pickup_location_id: '' }, admin),
    ).rejects.toThrow(/warehouse/i);
  });

  it('does not require a warehouse when updating a BRAND-owned product', async () => {
    const doc = await InventoryProductModel.create({
      product_name: 'Brand Item',
      sku: 'BWH-GUARD-1',
      unit_cost: 5,
      brand_id: new Types.ObjectId(),
      ownership: 'BRAND',
    });
    const updated = await inventoryService.update(String(doc._id), { product_name: 'Brand Item 2' }, admin);
    expect(updated.product_name).toBe('Brand Item 2');
    expect(updated.pickup_location_id).toBeNull();
  });
});
