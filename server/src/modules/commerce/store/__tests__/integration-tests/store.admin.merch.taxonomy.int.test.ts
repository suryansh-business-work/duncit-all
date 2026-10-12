import { Types } from 'mongoose';
import { storeAdminMerchService as svc } from '../../store.admin.merch.service';
import { StoreCollectionModel, StoreHomeSectionModel } from '../../storeMerch.model';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreCategoryModel, StoreFacetModel } from '../../storeTaxonomy.model';

/**
 * Pet types, pages, aisles, filters, collections and the home page: the
 * writes the Ecomm portal makes to how the store is organised.
 */

const missing = () => new Types.ObjectId().toHexString();

describe('pet types', () => {
  it('lists a pet whose categories were written before they carried pet ids', async () => {
    await StoreCategoryModel.collection.insertOne({ name: 'Legacy', slug: 'legacy' } as never);
    const dog = await svc.savePetType(null, { name: 'Dog' });
    expect(dog.category_ids).toEqual([]);
    expect((await svc.categories())[0]).toMatchObject({ name: 'Legacy', pet_type_ids: [] });
  });

  it('files exactly the categories sent under the pet, moving others out', async () => {
    const food = await svc.saveCategory(null, { name: 'Food' });
    const toys = await svc.saveCategory(null, { name: 'Toys' });
    const dog = await svc.savePetType(null, { name: 'Dog', category_ids: [food.id, toys.id, 'bad-id'] });
    expect(dog.category_ids.sort()).toEqual([food.id, toys.id].sort());
    expect(dog).toMatchObject({ slug: 'dog', sort_order: 0, is_active: true });

    const again = await svc.savePetType(dog.id, { name: 'Dog', category_ids: [toys.id] });
    expect(again.category_ids).toEqual([toys.id]);
    expect((await StoreCategoryModel.findById(food.id).lean())?.pet_type_ids).toEqual([]);

    const cleared = await svc.savePetType(dog.id, { name: 'Dog', category_ids: [] });
    expect(cleared.category_ids).toEqual([]);
    expect((await svc.petTypes())[0].category_ids).toEqual([]);
  });

  it('lists each pet with its categories in the categories’ own order, leaving a pet with none empty', async () => {
    const first = await svc.saveCategory(null, { name: 'Alpha' });
    const second = await svc.saveCategory(null, { name: 'Beta' });
    const dog = await svc.savePetType(null, { name: 'Dog', category_ids: [second.id, first.id] });
    await svc.savePetType(null, { name: 'Fish' });

    const rows = await svc.petTypes();
    expect(rows.find((r) => r.id === dog.id)?.category_ids).toEqual([first.id, second.id]);
    expect(rows.find((r) => r.name === 'Fish')?.category_ids).toEqual([]);
  });

  it('refuses a nameless pet, an unknown pet to edit, and deleting a pet products are filed under', async () => {
    await expect(svc.savePetType(null, { name: '' })).rejects.toThrow('Enter the pet type name');
    await expect(svc.savePetType(missing(), { name: 'Ghost' })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(svc.savePetType(null, { name: '!!!' })).rejects.toThrow('Enter a name');

    const cat = await svc.savePetType(null, { name: 'Cat' });
    await StoreProductModel.create({ product_name: 'Scratcher', sku: 'SC-1', store: { pet_type_ids: [cat.id] } });
    await expect(svc.deletePetType(cat.id)).rejects.toThrow('1 product(s) are filed under this pet type');
    await StoreProductModel.deleteMany({});
    expect(await svc.deletePetType(cat.id)).toBe(true);
    expect(await svc.petTypes()).toEqual([]);
  });

  it('reorders pet types and ignores ids that are not ids', async () => {
    const a = await svc.savePetType(null, { name: 'A' });
    const b = await svc.savePetType(null, { name: 'B' });
    expect(await svc.reorderPetTypes([b.id, 'junk', a.id])).toBe(true);
    expect((await svc.petTypes()).map((p) => p.name)).toEqual(['B', 'A']);
  });
});

describe('pages', () => {
  it('creates, edits, lists, reorders and deletes a page', async () => {
    const about = await svc.savePage(null, { title: 'About us', content_html: '<p>Hi</p>', seo_title: ' About ' });
    const terms = await svc.savePage(null, { title: 'Terms', show_in_footer: false, is_active: false });
    expect(about).toMatchObject({ slug: 'about-us', content_html: '<p>Hi</p>', seo_title: 'About', show_in_footer: true, sort_order: 0 });
    expect(terms).toMatchObject({ show_in_footer: false, is_active: false, sort_order: 1 });

    const edited = await svc.savePage(about.id, { title: 'About Duncit', slug: 'about' });
    expect(edited).toMatchObject({ title: 'About Duncit', slug: 'about' });

    await svc.reorderPages([terms.id, about.id]);
    expect((await svc.pages()).map((p) => p.slug)).toEqual(['terms', 'about']);
    expect(await svc.deletePage(about.id)).toBe(true);
    expect(await svc.pages()).toHaveLength(1);
  });

  it('refuses a page with no title or a URL key another page holds', async () => {
    await expect(svc.savePage(null, { title: ' ' })).rejects.toThrow('Give the page a title');
    await svc.savePage(null, { title: 'Privacy' });
    await expect(svc.savePage(null, { title: 'Privacy policy', slug: 'privacy' })).rejects.toThrow('already used');
  });
});

describe('categories', () => {
  it('nests a category under a parent and numbers its place among its siblings', async () => {
    const food = await svc.saveCategory(null, { name: 'Food' });
    const dry = await svc.saveCategory(null, { name: 'Dry', parent_id: food.id, pet_type_ids: [missing()], show_in_menu: false });
    const wet = await svc.saveCategory(null, { name: 'Wet', parent_id: food.id });
    expect(dry).toMatchObject({ parent_id: food.id, sort_order: 0, show_in_menu: false });
    expect(wet.sort_order).toBe(1);
    expect(await svc.categories()).toHaveLength(3);
  });

  it('refuses a nameless category, one inside itself, one under a parent that is gone, and an unknown one to edit', async () => {
    await expect(svc.saveCategory(null, { name: '' })).rejects.toThrow('Enter the category name');
    const food = await svc.saveCategory(null, { name: 'Food' });
    await expect(svc.saveCategory(food.id, { name: 'Food', parent_id: food.id })).rejects.toThrow('A category cannot sit inside itself');
    await expect(svc.saveCategory(null, { name: 'Orphan', parent_id: missing() })).rejects.toThrow('The parent category no longer exists');
    await expect(svc.saveCategory(missing(), { name: 'Ghost' })).rejects.toThrow('That item no longer exists');
  });

  it('will not delete a category that has sub-categories or products, then deletes an empty one', async () => {
    const food = await svc.saveCategory(null, { name: 'Food' });
    const dry = await svc.saveCategory(null, { name: 'Dry', parent_id: food.id });
    await expect(svc.deleteCategory(food.id)).rejects.toThrow('Move or delete its sub-categories first');

    await StoreProductModel.create({ product_name: 'Kibble', sku: 'KB-1', store: { category_ids: [dry.id] } });
    await expect(svc.deleteCategory(dry.id)).rejects.toThrow('1 product(s) are filed in this category');

    await StoreProductModel.deleteMany({});
    expect(await svc.deleteCategory(dry.id)).toBe(true);
    expect(await svc.deleteCategory(food.id)).toBe(true);
    expect(await StoreCategoryModel.countDocuments()).toBe(0);
  });

  it('reorders categories', async () => {
    const a = await svc.saveCategory(null, { name: 'A' });
    const b = await svc.saveCategory(null, { name: 'B' });
    await svc.reorderCategories([b.id, a.id]);
    expect((await svc.categories()).map((c) => c.name)).toEqual(['B', 'A']);
  });
});

describe('filters (facets)', () => {
  it('saves options with unique, made-up slugs and drops blank or repeated ones', async () => {
    const size = await svc.saveFacet(null, {
      name: 'Size',
      options: [{ label: 'Small' }, { label: 'Large', slug: 'l' }, { label: 'Small!' }, { label: '' }, { label: '   ', slug: 'x' }],
    });
    expect(size.options).toEqual([
      { label: 'Small', slug: 'small' },
      { label: 'Large', slug: 'l' },
    ]);
    expect(size.sort_order).toBe(0);
  });

  it('refuses a nameless filter or one with no usable option', async () => {
    await expect(svc.saveFacet(null, { name: ' ', options: [{ label: 'A' }] })).rejects.toThrow('Enter the filter name');
    await expect(svc.saveFacet(null, { name: 'Size' })).rejects.toThrow('Add at least one option');
    await expect(svc.saveFacet(null, { name: 'Size', options: [{ label: '' }] })).rejects.toThrow('Add at least one option');
  });

  it('removes a deleted filter’s values from every product', async () => {
    const colour = await svc.saveFacet(null, { name: 'Colour', options: [{ label: 'Red' }] });
    await StoreProductModel.create({
      product_name: 'Ball',
      sku: 'BL-1',
      store: { facet_values: [{ facet_id: colour.id, value: 'red' }] },
    });

    expect(await svc.deleteFacet(colour.id)).toBe(true);

    expect(await StoreFacetModel.countDocuments()).toBe(0);
    const product = await StoreProductModel.findOne({ sku: 'BL-1' }).lean();
    expect(product?.store?.facet_values ?? []).toEqual([]);
  });

  it('lists and reorders filters', async () => {
    const a = await svc.saveFacet(null, { name: 'A', options: [{ label: 'x' }] });
    const b = await svc.saveFacet(null, { name: 'B', options: [{ label: 'y' }] });
    await svc.reorderFacets([b.id, a.id]);
    expect((await svc.facets()).map((f) => f.name)).toEqual(['B', 'A']);
  });
});

describe('collections', () => {
  it('saves a smart collection with clamped rules, and falls back to manual for an unknown mode', async () => {
    const pet = await svc.savePetType(null, { name: 'Dog' });
    const smart = await svc.saveCollection(null, {
      name: 'Deals',
      mode: 'SMART',
      rules: { pet_type_ids: [pet.id], tags: [' sale ', 'sale'], min_discount_pct: 250, max_price: -1, featured_only: 1, in_stock_only: 0 },
    });
    expect(smart).toMatchObject({ mode: 'SMART', slug: 'deals', sort_order: 0 });
    expect(smart.rules).toMatchObject({
      pet_type_ids: [pet.id],
      tags: ['sale'],
      min_discount_pct: 100,
      max_price: 0,
      featured_only: true,
      in_stock_only: false,
    });

    const odd = await svc.saveCollection(null, { name: 'Odd', mode: 'WEIRD' });
    expect(odd.mode).toBe('MANUAL');
    expect((await svc.collections()).map((c) => c.name)).toEqual(['Deals', 'Odd']);
  });

  it('reads one collection, and refuses an unknown one or a nameless save', async () => {
    const c = await svc.saveCollection(null, { name: 'Picks', product_ids: [missing(), 'bad'] });
    expect((await svc.collection(c.id)).product_ids).toHaveLength(1);
    await expect(svc.collection(missing())).rejects.toThrow('Collection not found');
    await expect(svc.saveCollection(null, { name: '' })).rejects.toThrow('Enter the collection name');
  });

  it('un-links a deleted collection from the home sections that showed it', async () => {
    const c = await svc.saveCollection(null, { name: 'Picks' });
    const section = await svc.saveSection(null, { kind: 'COLLECTION_CAROUSEL', collection_id: c.id });
    expect(section.collection_id).toBe(c.id);

    expect(await svc.deleteCollection(c.id)).toBe(true);

    expect(await StoreCollectionModel.countDocuments()).toBe(0);
    expect((await StoreHomeSectionModel.findById(section.id).lean())?.collection_id).toBeNull();
  });

  it('previews what a collection shows and orders the picker’s products as picked', async () => {
    const [a, b] = await Promise.all([
      StoreProductModel.create({ product_name: 'Alpha', sku: 'PK-A', unit_cost: 100 }),
      StoreProductModel.create({ product_name: 'Beta', sku: 'PK-B', unit_cost: 200 }),
    ]);
    const cards = await svc.productsForPicker([String(b._id), missing(), String(a._id)]);
    expect(cards.map((c) => c.title)).toEqual(['Beta', 'Alpha']);

    const c = await svc.saveCollection(null, { name: 'Picks', product_ids: [String(a._id)] });
    expect(Array.isArray(await svc.previewCollection(c.slug))).toBe(true);
    await svc.reorderCollections([c.id]);
  });
});

describe('input missing its name', () => {
  it('treats an absent name as blank, never the word "undefined"', async () => {
    await expect(svc.savePetType(null, {})).rejects.toThrow('Enter the pet type name');
    await expect(svc.saveBrand(null, {})).rejects.toThrow('Enter the brand name');
    await expect(svc.savePage(null, {})).rejects.toThrow('Give the page a title');
    await expect(svc.saveCategory(null, {})).rejects.toThrow('Enter the category name');
    await expect(svc.saveFacet(null, {})).rejects.toThrow('Enter the filter name');
    await expect(svc.saveCollection(null, {})).rejects.toThrow('Enter the collection name');
  });

  it('drops a filter option with no label even when it has a slug', async () => {
    await expect(svc.saveFacet(null, { name: 'Size', options: [{ slug: 'x' }] })).rejects.toThrow('Add at least one option');
  });

  it('keeps editing a filter and a collection in place, without renumbering them', async () => {
    const facet = await svc.saveFacet(null, { name: 'Size', options: [{ label: 'S' }] });
    await svc.saveFacet(null, { name: 'Other', options: [{ label: 'x' }] });
    const edited = await svc.saveFacet(facet.id, { name: 'Sizes', options: [{ label: 'M' }] });
    expect(edited).toMatchObject({ name: 'Sizes', sort_order: 0, options: [{ label: 'M', slug: 'm' }] });

    const coll = await svc.saveCollection(null, { name: 'A' });
    await svc.saveCollection(null, { name: 'B' });
    expect(await svc.saveCollection(coll.id, { name: 'A2' })).toMatchObject({ name: 'A2', sort_order: 0 });
  });
});

describe('home sections', () => {
  it('refuses an unknown kind, and a flash sale with no end time', async () => {
    await expect(svc.saveSection(null, { kind: 'NOPE' })).rejects.toThrow('Choose what this section shows');
    await expect(svc.saveSection(null, { kind: 'FLASH_SALE', ends_at: 'garbage' })).rejects.toThrow('needs an end time');
  });

  it('saves a section with trimmed items, clamped limit and tiers, and a default source', async () => {
    const section = await svc.saveSection(null, {
      kind: 'FLASH_SALE',
      title: ' Flash ',
      ends_at: '2026-12-01T00:00:00.000Z',
      starts_at: '2026-11-30T00:00:00.000Z',
      product_limit: 500,
      discount_tiers: [30, 10, 10, 95],
      product_source: 'UNKNOWN',
      items: [{ title: ' Banner ', link: ' /x ' }],
    });
    expect(section).toMatchObject({
      title: 'Flash',
      product_limit: 48,
      discount_tiers: [10, 30],
      product_source: 'COLLECTION',
      sort_order: 0,
      starts_at: '2026-11-30T00:00:00.000Z',
    });
    expect(section.items[0]).toMatchObject({ title: 'Banner', link: '/x', subtitle: '' });
  });

  it('saves an item with nothing filled in as blanks', async () => {
    const section = await svc.saveSection(null, { kind: 'HERO_SLIDER', items: [{}, { link: '/only' }] });
    expect(section.items).toHaveLength(2);
    expect(section.items[0]).toMatchObject({ title: '', link: '' });
    expect(section.items[1]).toMatchObject({ title: '', link: '/only' });
  });

  it('floors a zero or missing product limit to the default and keeps manual products', async () => {
    const product = missing();
    const zero = await svc.saveSection(null, { kind: 'PRODUCT_SLIDER', product_limit: 0, product_source: 'MANUAL', product_ids: [product] });
    expect(zero).toMatchObject({ product_limit: 12, product_source: 'MANUAL', product_ids: [product], ends_at: null });
  });

  it('edits, lists, reorders and deletes sections', async () => {
    const a = await svc.saveSection(null, { kind: 'BRANDS', title: 'A' });
    const b = await svc.saveSection(null, { kind: 'USP_STRIP', title: 'B' });
    const edited = await svc.saveSection(a.id, { kind: 'BRANDS', title: 'A2', is_active: false });
    expect(edited).toMatchObject({ title: 'A2', is_active: false });

    await svc.reorderSections([b.id, a.id]);
    expect((await svc.sections()).map((s) => s.title)).toEqual(['B', 'A2']);
    expect(await svc.deleteSection(a.id)).toBe(true);
    expect(await svc.sections()).toHaveLength(1);
  });
});
