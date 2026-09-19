import { Types } from 'mongoose';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { publishGaps, storeAdminProductsService } from '../../store.admin.products.service';
import { storeCatalogService } from '../../store.catalog.service';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreBrandModel, StoreCategoryModel, StorePetTypeModel } from '../../storeTaxonomy.model';

/**
 * The Ecomm portal's own catalogue: a product saved as a DRAFT keeps whatever
 * was typed and stays off the store; PUBLISHED puts it on sale only once it can
 * really be sold, and says exactly what is missing when it cannot.
 */

const OPERATOR = new Types.ObjectId().toHexString();

async function seedShelf() {
  const [warehouse, brand, category] = await Promise.all([
    BrandPickupLocationModel.create({
      owner_kind: 'DUNCIT',
      nickname: 'DUN-WH-GZB',
      pincode: '201017',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
    }),
    StoreBrandModel.create({ name: 'Drools', slug: 'drools' }),
    StoreCategoryModel.create({ name: 'Dry Food', slug: 'dry-food' }),
  ]);
  return { warehouse, brand, category };
}

/** Everything a sellable product needs: price, photo, category, warehouse, brand, packed parcel, HSN. */
function sellable(shelf: Awaited<ReturnType<typeof seedShelf>>, over: Record<string, unknown> = {}) {
  return {
    product_name: 'Drools Adult Chicken 3 kg',
    brand_id: String(shelf.brand._id),
    images: ['https://ik.imagekit.io/duncit/store/drools-3kg.jpg'],
    price: 849,
    mrp: 999,
    stock: 24,
    warehouse_id: String(shelf.warehouse._id),
    category_ids: [String(shelf.category._id)],
    weight_kg: 3.2,
    length_cm: 40,
    breadth_cm: 28,
    height_cm: 10,
    hsn_code: '2309',
    ...over,
  };
}

describe('storeAdminProductsService.save — drafts', () => {
  it('saves a draft from just a name, mints a SKU and keeps it off the store', async () => {
    const draft = await storeAdminProductsService.save(OPERATOR, null, { product_name: 'Chew toy' }, 'DRAFT');

    expect(draft.status).toBe('DRAFT');
    expect(draft.sku).toMatch(/^PET-[\dA-F]{6}$/);
    expect(draft.product_name).toBe('Chew toy');
    expect(draft.published_at).toBeNull();
    expect(await StoreProductModel.countDocuments({ status: 'PUBLISHED' })).toBe(0);
  });

  it('refuses a product with no name, whatever the status', async () => {
    await expect(storeAdminProductsService.save(OPERATOR, null, { product_name: '   ' }, 'DRAFT')).rejects.toThrow(
      'Give the product a name'
    );
  });

  it('refuses an unknown status', async () => {
    await expect(
      storeAdminProductsService.save(OPERATOR, null, { product_name: 'Bowl' }, 'LIVE' as never)
    ).rejects.toThrow('Unknown product status');
  });

  it('keeps a typed SKU upper-cased and refuses one another product holds', async () => {
    const first = await storeAdminProductsService.save(OPERATOR, null, { product_name: 'Leash', sku: 'dun-leash-01' }, 'DRAFT');
    expect(first.sku).toBe('DUN-LEASH-01');

    await expect(
      storeAdminProductsService.save(OPERATOR, null, { product_name: 'Other leash', sku: 'DUN-LEASH-01' }, 'DRAFT')
    ).rejects.toThrow('The SKU "DUN-LEASH-01" is already used by another product');
  });

  it('refuses a brand that no longer exists and a warehouse that is not Duncit’s', async () => {
    await expect(
      storeAdminProductsService.save(OPERATOR, null, { product_name: 'Harness', brand_id: new Types.ObjectId().toHexString() }, 'DRAFT')
    ).rejects.toThrow('That brand no longer exists');

    const partner = await BrandPickupLocationModel.create({ owner_kind: 'BRAND', nickname: 'PARTNER-WH', pincode: '110001' });
    await expect(
      storeAdminProductsService.save(OPERATOR, null, { product_name: 'Harness', warehouse_id: String(partner._id) }, 'DRAFT')
    ).rejects.toThrow('Pick one of Duncit’s warehouses');
  });
});

describe('storeAdminProductsService.save — publishing', () => {
  it('names every gap between a draft and the shelf', async () => {
    await expect(storeAdminProductsService.save(OPERATOR, null, { product_name: 'Cat tree' }, 'PUBLISHED')).rejects.toThrow(
      /Before publishing, add a selling price, at least one photo, a category, the warehouse it ships from, a brand, the packaging/
    );
    expect(await StoreProductModel.countDocuments()).toBe(0);
  });

  it('publishes a sellable product: the brand name is copied and the storefront finds it by its slug', async () => {
    const shelf = await seedShelf();
    const product = await storeAdminProductsService.save(OPERATOR, null, sellable(shelf), 'PUBLISHED');

    expect(product.status).toBe('PUBLISHED');
    expect(product.slug).toBe('drools-adult-chicken-3-kg');
    expect(product.brand_name).toBe('Drools');
    expect(product.published_at).not.toBeNull();

    const page = await storeCatalogService.productBySlug('drools-adult-chicken-3-kg');
    expect(page?.title).toBe('Drools Adult Chicken 3 kg');
    expect(page?.price).toBe(849);
    expect(page?.mrp).toBe(999);
    expect(page?.brand?.name).toBe('Drools');
  });

  it('suffixes a clashing URL key it made itself, but refuses a typed one already published', async () => {
    const shelf = await seedShelf();
    await storeAdminProductsService.save(OPERATOR, null, sellable(shelf), 'PUBLISHED');

    const twin = await storeAdminProductsService.save(OPERATOR, null, sellable(shelf, { sku: 'TWIN-1' }), 'PUBLISHED');
    expect(twin.slug).toBe('drools-adult-chicken-3-kg-2');

    await expect(
      storeAdminProductsService.save(OPERATOR, null, sellable(shelf, { sku: 'TWIN-2', slug: 'drools-adult-chicken-3-kg' }), 'PUBLISHED')
    ).rejects.toThrow('The URL key "drools-adult-chicken-3-kg" is already used by a published product');
  });

  it('prices a variant product from its variants and keeps each variant id across saves', async () => {
    const shelf = await seedShelf();
    const input = sellable(shelf, {
      variant_option: 'Size',
      variants: [
        { option_label: '3 kg', price: 849, mrp: 999, stock: 10, weight_kg: 3.2 },
        { option_label: '10 kg', price: 2499, stock: 4, weight_kg: 10.4, length_cm: 60, breadth_cm: 40, height_cm: 15 },
      ],
    });
    const created = await storeAdminProductsService.save(OPERATOR, null, input, 'PUBLISHED');

    expect(created.price).toBe(849);
    expect(created.stock).toBe(14);
    expect(created.variant_option).toBe('Size');
    expect(created.variants.map((v) => v.option_label)).toEqual(['3 kg', '10 kg']);

    const [small, large] = created.variants;
    const edited = await storeAdminProductsService.save(
      OPERATOR,
      created.id,
      {
        ...input,
        variants: [
          { id: small.id, option_label: '3 kg', price: 799, stock: 8, weight_kg: 3.2 },
          { id: large.id, option_label: '10 kg', price: 2499, stock: 4, weight_kg: 10.4 },
        ],
      },
      'PUBLISHED'
    );
    expect(edited.variants.map((v) => v.id)).toEqual([small.id, large.id]);
    expect(edited.price).toBe(799);
    expect(edited.stock).toBe(12);

    const page = await storeCatalogService.productBySlug(created.slug);
    expect(page?.options).toEqual([{ name: 'Size', values: ['3 kg', '10 kg'] }]);
    expect(page?.variants[0].option_values).toEqual([{ name: 'Size', value: '3 kg' }]);
  });

  it('needs the variant option name and a price on every variant before publishing', async () => {
    const shelf = await seedShelf();
    const input = sellable(shelf, { variants: [{ option_label: '', price: 0, stock: 3, weight_kg: 1 }] });
    await expect(storeAdminProductsService.save(OPERATOR, null, input, 'PUBLISHED')).rejects.toThrow(
      /a name and price for every variant, what the variants differ by \(e\.g\. Size\)/
    );
  });

  it('answers not found for a product id that does not exist', async () => {
    const missing = new Types.ObjectId().toHexString();
    await expect(storeAdminProductsService.save(OPERATOR, missing, { product_name: 'Bed' }, 'DRAFT')).rejects.toThrow(
      'Product not found'
    );
    await expect(storeAdminProductsService.get(missing)).rejects.toThrow('Product not found');
  });
});

describe('storeAdminProductsService.setStatus', () => {
  it('publishes the ready products, skips the rest, then drafts and archives them', async () => {
    const shelf = await seedShelf();
    const ready = await storeAdminProductsService.save(OPERATOR, null, sellable(shelf), 'DRAFT');
    const unready = await storeAdminProductsService.save(OPERATOR, null, { product_name: 'Unfinished bowl' }, 'DRAFT');

    expect(await storeAdminProductsService.setStatus([ready.id, unready.id], 'PUBLISHED')).toBe(1);
    const published = await StoreProductModel.findById(ready.id).lean();
    expect(published?.status).toBe('PUBLISHED');
    expect(published?.store.slug).toBe('drools-adult-chicken-3-kg');
    expect(published?.store.listed_at).toBeInstanceOf(Date);
    expect((await StoreProductModel.findById(unready.id).lean())?.status).toBe('DRAFT');

    expect(await storeAdminProductsService.setStatus([ready.id], 'ARCHIVED')).toBe(1);
    expect(await storeCatalogService.productBySlug('drools-adult-chicken-3-kg')).toBeNull();

    expect(await storeAdminProductsService.setStatus([ready.id, unready.id], 'DRAFT')).toBe(2);
  });

  it('refuses an unknown status', async () => {
    await expect(storeAdminProductsService.setStatus([], 'GONE' as never)).rejects.toThrow('Unknown product status');
  });
});

describe('storeAdminProductsService — table, filing and warehouses', () => {
  it('lists every product with its status and flags one with no warehouse', async () => {
    await storeAdminProductsService.save(OPERATOR, null, { product_name: 'Scratcher' }, 'DRAFT');
    const page = await storeAdminProductsService.table(null);

    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({ product_name: 'Scratcher', status: 'DRAFT', has_warehouse: false, image_url: '' });
  });

  it('files many products under more pet types and categories, never removing any', async () => {
    const shelf = await seedShelf();
    const dogs = await StorePetTypeModel.create({ name: 'Dogs', slug: 'dogs' });
    const product = await storeAdminProductsService.save(OPERATOR, null, sellable(shelf), 'DRAFT');

    expect(await storeAdminProductsService.bulkFile([product.id], [String(dogs._id)], [String(shelf.category._id)])).toBe(1);
    const filed = await storeAdminProductsService.get(product.id);
    expect(filed.pet_type_ids).toEqual([String(dogs._id)]);
    expect(filed.category_ids).toEqual([String(shelf.category._id)]);
  });

  it('offers only Duncit’s own warehouses, the default first', async () => {
    await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'B-NOIDA', pincode: '201301', city: 'Noida' });
    await BrandPickupLocationModel.create({
      owner_kind: 'DUNCIT',
      nickname: 'A-HOME',
      pincode: '201017',
      city: 'Ghaziabad',
      is_default: true,
      shiprocket_registered: true,
    });
    await BrandPickupLocationModel.create({ owner_kind: 'BRAND', nickname: 'PARTNER', pincode: '110001' });

    const warehouses = await storeAdminProductsService.warehouses();
    expect(warehouses.map((w) => w.nickname)).toEqual(['A-HOME', 'B-NOIDA']);
    expect(warehouses[0]).toMatchObject({ is_default: true, shiprocket_ready: true, pincode: '201017' });
  });
});

describe('publishGaps', () => {
  it('is empty for a product that can be sold', async () => {
    const shelf = await seedShelf();
    const product = await storeAdminProductsService.save(OPERATOR, null, sellable(shelf), 'DRAFT');
    const doc = await StoreProductModel.findById(product.id);
    expect(publishGaps(doc!)).toEqual([]);
  });
});
