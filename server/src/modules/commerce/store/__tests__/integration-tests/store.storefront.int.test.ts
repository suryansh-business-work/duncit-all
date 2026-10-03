jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  getServiceability: jest.fn(),
  isShiprocketConfigured: jest.fn(),
}));
jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  ...jest.requireActual('@modules/finance/payment/razorpay.gateway'),
  isRazorpayConfigured: jest.fn(),
}));

import { Types } from 'mongoose';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { getServiceability } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { isRazorpayConfigured } from '@modules/finance/payment/razorpay.gateway';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreBrandModel, StoreCategoryModel, StorePetTypeModel } from '../../storeTaxonomy.model';
import { StoreCollectionModel, StoreHomeSectionModel } from '../../storeMerch.model';
import { StorePageModel } from '../../storePage.model';
import { StoreSettingsModel } from '../../storeSettings.model';
import { storeStorefrontService } from '../../store.storefront.service';

/**
 * The pet store's public frame: settings the storefront may see, the header
 * menu, the home page blocks, the landing pages, the pincode and delivery
 * checks, and the sitemap. Only what is live and published may ever show.
 */

const mockRate = jest.mocked(getServiceability);
const mockRazorpay = jest.mocked(isRazorpayConfigured);
const DAY = 86_400_000;
const GURUGRAM = '122002';

const setSettings = (set: Record<string, unknown>) =>
  StoreSettingsModel.updateOne({ singleton_key: 'store' }, { $set: set }, { upsert: true, setDefaultsOnInsert: true });

let skuSeq = 0;
const seedProduct = (over: Record<string, unknown> = {}, store: Record<string, unknown> = {}) =>
  StoreProductModel.create({
    product_name: `Product ${++skuSeq}`,
    sku: `PET-T${skuSeq}`,
    images: ['https://ik.imagekit.io/duncit/store/p.jpg'],
    unit_cost: 499,
    inventory_count: 20,
    weight_kg: 1.2,
    length_cm: 30,
    breadth_cm: 20,
    height_cm: 8,
    status: 'PUBLISHED',
    ...over,
    store: { slug: `product-${skuSeq}`, ...store },
  });

beforeEach(() => {
  mockRazorpay.mockResolvedValue(false);
});

describe('storeStorefrontService.settings', () => {
  it('shows the defaults and says dummy mode is live when no Razorpay account is configured', async () => {
    const s = await storeStorefrontService.settings();
    expect(s).toMatchObject({
      store_enabled: false,
      store_name: 'Duncit Pet Store',
      guest_checkout_enabled: true,
      cod_enabled: false,
      serviceable_pincodes_enabled: false,
      active_occasion: null,
      social_links: [],
      currency_symbol: '₹',
      dummy_mode: true,
    });
    expect(s).not.toHaveProperty('razorpay_account');
    expect(s).not.toHaveProperty('updated_by_id');
  });

  it('turns dummy mode off once a Razorpay account can open a sheet', async () => {
    mockRazorpay.mockResolvedValue(true);
    await setSettings({ razorpay_account: 'petstore' });
    expect((await storeStorefrontService.settings()).dummy_mode).toBe(false);
    expect(mockRazorpay).toHaveBeenCalledWith('petstore');
  });

  it('reports a pincode list only when it is switched on AND has entries, and paints the open occasion', async () => {
    const now = Date.now();
    await setSettings({
      serviceable_pincodes_enabled: true,
      serviceable_pincodes: [],
      social_links: [{ label: 'Instagram', url: 'https://instagram.com/duncitpets' }],
      occasions: [
        {
          slug: 'diwali',
          label: 'Diwali',
          starts_at: new Date(now - DAY),
          ends_at: new Date(now + DAY),
          background_color: '#FFF4E0',
          announcement_text: 'Diwali treats are here',
        },
        { slug: 'holi', label: 'Holi', starts_at: new Date(now + 10 * DAY), ends_at: new Date(now + 12 * DAY) },
      ],
    });

    const s = await storeStorefrontService.settings();
    expect(s.serviceable_pincodes_enabled).toBe(false);
    expect(s.social_links).toEqual([{ label: 'Instagram', url: 'https://instagram.com/duncitpets' }]);
    expect(s.active_occasion).toEqual({
      slug: 'diwali',
      label: 'Diwali',
      logo_url: '',
      favicon_url: '',
      background_url: '',
      background_color: '#FFF4E0',
      announcement_text: 'Diwali treats are here',
      ends_at: new Date(now + DAY).toISOString(),
    });

    await setSettings({ serviceable_pincodes: [GURUGRAM] });
    expect((await storeStorefrontService.settings()).serviceable_pincodes_enabled).toBe(true);
  });
});

describe('storeStorefrontService.navigation, page and landing pages', () => {
  it('builds the header menu from live records only, children under their parents', async () => {
    const [dogs, cats] = await StorePetTypeModel.create([
      { name: 'Dogs', slug: 'dogs', sort_order: 0 },
      { name: 'Cats', slug: 'cats', sort_order: 1 },
    ]);
    await StorePetTypeModel.create({ name: 'Fish', slug: 'fish', is_active: false });
    const food = await StoreCategoryModel.create({ name: 'Food', slug: 'food', pet_type_ids: [dogs._id, cats._id] });
    const dry = await StoreCategoryModel.create({ name: 'Dry Food', slug: 'dry-food', parent_id: food._id, pet_type_ids: [dogs._id] });
    const hidden = await StoreCategoryModel.create({ name: 'Hidden', slug: 'hidden', is_active: false });
    await StoreCategoryModel.create({ name: 'Orphan', slug: 'orphan', parent_id: hidden._id });
    await StoreCategoryModel.create({ name: 'Treats', slug: 'treats', show_in_menu: false, sort_order: 1 });
    await StoreCollectionModel.create([
      { name: 'Diwali Picks', slug: 'diwali-picks', image_url: 'https://x/d.jpg' },
      { name: 'Old', slug: 'old', is_active: false },
    ]);
    await StorePageModel.create([
      { title: 'About us', slug: 'about-us' },
      { title: 'Terms', slug: 'terms', show_in_footer: false },
      { title: 'Retired', slug: 'retired', is_active: false },
    ]);

    const nav = await storeStorefrontService.navigation();

    expect(nav.pet_types.map((p) => p.slug)).toEqual(['dogs', 'cats']);
    expect(nav.categories.map((c) => [c.slug, c.show_in_menu, c.children.map((k: { slug: string }) => k.slug)])).toEqual([
      ['food', true, ['dry-food']],
      ['orphan', true, []],
      ['treats', false, []],
    ]);
    expect(nav.categories[0].children[0]).toMatchObject({ id: String(dry._id), parent_id: String(food._id), pet_type_ids: [String(dogs._id)] });
    expect(nav.collections).toEqual([expect.objectContaining({ slug: 'diwali-picks', image_url: 'https://x/d.jpg' })]);
    expect(nav.pages.map((p) => p.slug)).toEqual(['about-us']);
  });

  it('serves a page by its slug however it is typed, and nothing for a switched-off one', async () => {
    await StorePageModel.create([
      { title: 'About us', slug: 'about-us', content_html: '<p>Hi</p>', seo_title: 'About Duncit Pets' },
      { title: 'Retired', slug: 'retired', is_active: false },
    ]);
    expect(await storeStorefrontService.page('  About-Us ')).toMatchObject({
      title: 'About us',
      slug: 'about-us',
      content_html: '<p>Hi</p>',
      seo_title: 'About Duncit Pets',
      seo_description: '',
    });
    expect(await storeStorefrontService.page('retired')).toBeNull();
    expect(await storeStorefrontService.page(undefined as never)).toBeNull();
  });

  it('serves a pet landing page with its aisles, and nothing for an unknown pet', async () => {
    const dogs = await StorePetTypeModel.create({ name: 'Dogs', slug: 'dogs', description: 'Everything for dogs' });
    await StoreCategoryModel.create({ name: 'Food', slug: 'food', pet_type_ids: [dogs._id] });
    await StoreCategoryModel.create({ name: 'Litter', slug: 'litter' });
    const page = await storeStorefrontService.petType('dogs');
    expect(page).toMatchObject({ name: 'Dogs', description: 'Everything for dogs', icon_url: '', image_url: '' });
    expect(page!.categories.map((c) => c.slug)).toEqual(['food']);
    expect(await storeStorefrontService.petType('dragons')).toBeNull();
  });

  it('serves an aisle with its parent and live children', async () => {
    const food = await StoreCategoryModel.create({ name: 'Food', slug: 'food' });
    const dry = await StoreCategoryModel.create({ name: 'Dry Food', slug: 'dry-food', parent_id: food._id, seo_title: 'Dry dog food' });
    await StoreCategoryModel.create({ name: 'Kibble', slug: 'kibble', parent_id: dry._id });
    await StoreCategoryModel.create({ name: 'Off', slug: 'off', parent_id: dry._id, is_active: false });

    const aisle = await storeStorefrontService.category('dry-food');
    expect(aisle).toMatchObject({ slug: 'dry-food', seo_title: 'Dry dog food', parent: expect.objectContaining({ slug: 'food' }) });
    expect(aisle!.children.map((c) => c.slug)).toEqual(['kibble']);
    expect((await storeStorefrontService.category('food'))!.parent).toBeNull();
    expect(await storeStorefrontService.category('nope')).toBeNull();
  });

  it('serves a live collection and nothing for a switched-off one', async () => {
    await StoreCollectionModel.create([
      { name: 'Diwali Picks', slug: 'diwali-picks', description: 'Festive treats' },
      { name: 'Old', slug: 'old', is_active: false },
    ]);
    expect(await storeStorefrontService.collection('diwali-picks')).toMatchObject({
      name: 'Diwali Picks',
      description: 'Festive treats',
      image_url: '',
      banner_url: '',
    });
    expect(await storeStorefrontService.collection('old')).toBeNull();
  });
});

describe('storeStorefrontService.pincodeServiceable', () => {
  it('answers from the operator’s list when one is on, and allows any valid pincode when it is off', async () => {
    expect(await storeStorefrontService.pincodeServiceable('122 002')).toEqual({ pincode: GURUGRAM, restricted: false, serviceable: true });
    expect(await storeStorefrontService.pincodeServiceable('1220')).toEqual({ pincode: '1220', restricted: false, serviceable: false });

    await setSettings({ serviceable_pincodes_enabled: true, serviceable_pincodes: [GURUGRAM] });
    expect(await storeStorefrontService.pincodeServiceable(GURUGRAM)).toEqual({ pincode: GURUGRAM, restricted: true, serviceable: true });
    expect(await storeStorefrontService.pincodeServiceable('560001')).toEqual({ pincode: '560001', restricted: true, serviceable: false });
    expect((await storeStorefrontService.pincodeServiceable(null as never)).pincode).toBe('');
  });
});

describe('storeStorefrontService.home', () => {
  it('resolves every live block in order and drops the ones outside their window', async () => {
    const now = Date.now();
    const dogs = await StorePetTypeModel.create({ name: 'Dogs', slug: 'dogs' });
    const food = await StoreCategoryModel.create({ name: 'Food', slug: 'food' });
    const dry = await StoreCategoryModel.create({ name: 'Dry Food', slug: 'dry-food', parent_id: food._id });
    const toys = await StoreCategoryModel.create({ name: 'Toys', slug: 'toys', sort_order: 1 });
    const [drools, retired] = await StoreBrandModel.create([
      { name: 'Drools', slug: 'drools' },
      { name: 'Retired', slug: 'retired', is_active: false },
    ]);
    const adult = await seedProduct(
      { product_name: 'Drools Adult 3kg', unit_cost: 849, brand_id: drools._id, brand_name: 'Drools' },
      { slug: 'drools-adult-3kg', mrp: 999, category_ids: [dry._id], pet_type_ids: [dogs._id], sold_count: 50, listed_at: new Date('2026-09-01') }
    );
    const puppy = await seedProduct(
      { product_name: 'Drools Puppy 1kg', unit_cost: 499, brand_id: drools._id, brand_name: 'Drools' },
      { slug: 'drools-puppy-1kg', category_ids: [food._id], sold_count: 10, listed_at: new Date('2026-09-10') }
    );
    await seedProduct(
      { product_name: 'Old Brand Bowl', brand_id: retired._id, brand_name: 'Retired' },
      { slug: 'old-brand-bowl', listed_at: new Date('2026-08-01') }
    );
    await seedProduct({ product_name: 'Draft Toy', status: 'DRAFT' }, { slug: 'draft-toy', category_ids: [toys._id] });
    const diwali = await StoreCollectionModel.create({ name: 'Diwali Picks', slug: 'diwali-picks', product_ids: [puppy._id] });
    const off = await StoreCollectionModel.create({ name: 'Off', slug: 'off', is_active: false });

    const section = (sort_order: number, over: Record<string, unknown>) => ({ sort_order, ...over });
    await StoreHomeSectionModel.create([
      section(0, { kind: 'HERO_SLIDER', title: 'Hello', items: [{ title: 'Slide', image_url: 'https://x/1.jpg', link: '/c/food' }] }),
      section(1, { kind: 'FLASH_SALE', collection_id: diwali._id, discount_tiers: [10, 20], ends_at: new Date(now + DAY) }),
      section(2, { kind: 'FLASH_SALE' }),
      section(3, { kind: 'COLLECTION_CAROUSEL', collection_id: diwali._id }),
      section(4, { kind: 'COLLECTION_CAROUSEL', collection_id: off._id }),
      section(5, { kind: 'CATEGORY_GRID', category_ids: [dry._id] }),
      section(6, { kind: 'CATEGORY_ICONS' }),
      section(7, { kind: 'PRODUCT_SLIDER', product_source: 'MANUAL', product_ids: [puppy._id, adult._id], product_limit: 1 }),
      section(8, { kind: 'PRODUCT_SLIDER', product_source: 'CATEGORY', category_ids: [food._id] }),
      section(9, { kind: 'PRODUCT_SLIDER', product_source: 'DISCOUNT' }),
      section(10, { kind: 'PRODUCT_SLIDER', product_source: 'NEWEST' }),
      section(11, { kind: 'PRODUCT_SLIDER', product_source: 'COLLECTION', collection_id: diwali._id }),
      section(12, { kind: 'PRODUCT_SLIDER', product_source: 'COLLECTION' }),
      section(13, { kind: 'PRODUCT_SLIDER', product_source: 'CATEGORY' }),
      section(14, { kind: 'PET_TYPES' }),
      section(15, { kind: 'BRANDS' }),
      section(16, { kind: 'NEWSLETTER', title: 'Join', starts_at: new Date(now + DAY) }),
      section(17, { kind: 'NEWSLETTER', title: 'Over', ends_at: new Date(now - DAY) }),
      section(18, { kind: 'USP_STRIP', is_active: false }),
    ]);

    const home = await storeStorefrontService.home();

    expect(home.map((s) => s.kind)).toEqual([
      'HERO_SLIDER',
      'FLASH_SALE',
      'FLASH_SALE',
      'COLLECTION_CAROUSEL',
      'COLLECTION_CAROUSEL',
      'CATEGORY_GRID',
      'CATEGORY_ICONS',
      'PRODUCT_SLIDER',
      'PRODUCT_SLIDER',
      'PRODUCT_SLIDER',
      'PRODUCT_SLIDER',
      'PRODUCT_SLIDER',
      'PRODUCT_SLIDER',
      'PRODUCT_SLIDER',
      'PET_TYPES',
      'BRANDS',
    ]);
    const titles = (i: number) => home[i].products.map((p: { title: string }) => p.title);

    expect(home[0]).toMatchObject({ title: 'Hello', subtitle: '', ends_at: null, collection: null, products: [] });
    expect(home[0].items).toEqual([
      expect.objectContaining({ title: 'Slide', subtitle: '', image_url: 'https://x/1.jpg', mobile_image_url: '', cta_label: '', link: '/c/food' }),
    ]);
    expect(home[1]).toMatchObject({ collection: { id: String(diwali._id), name: 'Diwali Picks', slug: 'diwali-picks' }, discount_tiers: [10, 20] });
    expect(home[1].ends_at).toBe(new Date(now + DAY).toISOString());
    expect(home[2].collection).toBeNull();
    expect(home[3].collection).toMatchObject({ slug: 'diwali-picks' });
    expect(titles(3)).toEqual(['Drools Puppy 1kg']);
    expect(home[4]).toMatchObject({ collection: null, products: [] });
    expect(home[5].categories.map((c: { slug: string }) => c.slug)).toEqual(['dry-food']);
    expect(home[6].categories.map((c: { slug: string }) => c.slug)).toEqual(['food', 'toys']);
    expect(titles(7)).toEqual(['Drools Puppy 1kg']);
    expect(titles(8)).toEqual(['Drools Adult 3kg', 'Drools Puppy 1kg']);
    expect(home[8].categories.map((c: { slug: string }) => c.slug)).toEqual(['food']);
    expect(titles(9)).toEqual(['Drools Adult 3kg']);
    expect(titles(10)).toEqual(['Drools Puppy 1kg', 'Drools Adult 3kg', 'Old Brand Bowl']);
    expect(titles(11)).toEqual(['Drools Puppy 1kg']);
    expect(home[11].collection).toMatchObject({ slug: 'diwali-picks' });
    expect(home[12]).toMatchObject({ products: [], collection: null, categories: [] });
    expect(home[13]).toMatchObject({ products: [], categories: [] });
    expect(home[14].pet_types.map((p: { slug: string }) => p.slug)).toEqual(['dogs']);
    expect(home[15].brands).toEqual([{ id: String(drools._id), name: 'Drools', slug: 'drools', logo_url: '', tagline: '' }]);
  });

  it('is empty when no block is live', async () => {
    expect(await storeStorefrontService.home()).toEqual([]);
  });
});

describe('storeStorefrontService.brands and sitemap', () => {
  it('lists only live brands with something published, and maps every public URL key', async () => {
    const [drools, whiskas] = await StoreBrandModel.create([
      { name: 'Drools', slug: 'drools', tagline: 'Real chicken' },
      { name: 'Whiskas', slug: 'whiskas' },
    ]);
    await seedProduct({ brand_id: drools._id }, { slug: 'drools-adult' });
    await seedProduct({ brand_id: whiskas._id, status: 'DRAFT' }, { slug: 'whiskas-draft' });
    await StoreCategoryModel.create([{ name: 'Food', slug: 'food' }, { name: 'Off', slug: 'off-cat', is_active: false }]);
    await StoreCollectionModel.create({ name: 'Picks', slug: 'picks' });
    await StorePetTypeModel.create({ name: 'Dogs', slug: 'dogs' });
    await StorePageModel.create({ title: 'About', slug: 'about' });

    expect(await storeStorefrontService.brands()).toEqual([
      { id: String(drools._id), name: 'Drools', slug: 'drools', logo_url: '', tagline: 'Real chicken' },
    ]);

    const map = await storeStorefrontService.sitemap();
    expect(map.map((r) => [r.kind, r.slug])).toEqual([
      ['PRODUCT', 'drools-adult'],
      ['CATEGORY', 'food'],
      ['COLLECTION', 'picks'],
      ['PET_TYPE', 'dogs'],
      ['BRAND', 'drools'],
      ['PAGE', 'about'],
    ]);
    expect(map.every((r) => typeof r.updated_at === 'string')).toBe(true);
  });
});

describe('storeStorefrontService.deliveryCheck', () => {
  const unchecked = (pincode: string) => ({ pincode, checked: false, serviceable: false, etd: '', courier_name: '', cod_available: false });

  async function seedShippable(store: Record<string, unknown> = {}) {
    const warehouse = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'DUN-WH-NOIDA', pincode: '201301' });
    return seedProduct({ unit_cost: 849, pickup_location_id: warehouse._id }, store);
  }

  it('does not ask the courier about a malformed pincode', async () => {
    expect(await storeStorefrontService.deliveryCheck(new Types.ObjectId().toHexString(), null, '1220')).toEqual(unchecked('1220'));
    expect(mockRate).not.toHaveBeenCalled();
  });

  it('answers "not served" from the operator’s own list without asking the courier', async () => {
    await setSettings({ serviceable_pincodes_enabled: true, serviceable_pincodes: ['110001'] });
    const product = await seedShippable();
    expect(await storeStorefrontService.deliveryCheck(String(product._id), null, GURUGRAM)).toEqual({ ...unchecked(GURUGRAM), checked: true });
    expect(mockRate).not.toHaveBeenCalled();
  });

  it('cannot check a product that does not exist, or one with no warehouse', async () => {
    expect(await storeStorefrontService.deliveryCheck('junk', null, GURUGRAM)).toEqual(unchecked(GURUGRAM));
    expect(await storeStorefrontService.deliveryCheck(new Types.ObjectId().toHexString(), null, GURUGRAM)).toEqual(unchecked(GURUGRAM));
    const loose = await seedProduct();
    expect(await storeStorefrontService.deliveryCheck(String(loose._id), null, GURUGRAM)).toEqual(unchecked(GURUGRAM));
    expect(mockRate).not.toHaveBeenCalled();
  });

  it('rates the parcel prepaid and cash-on-delivery when COD is allowed', async () => {
    await setSettings({ cod_enabled: true });
    const product = await seedShippable();
    mockRate.mockImplementation(async (lane: { cod?: boolean }) =>
      lane.cod ? null : { serviceable: true, courier_name: 'Delhivery Surface', courier_company_id: '12', freight_charge: 68, etd: 'Oct 08, 2026' }
    );

    const out = await storeStorefrontService.deliveryCheck(String(product._id), null, '122-002');

    expect(out).toEqual({ pincode: GURUGRAM, checked: true, serviceable: true, etd: 'Oct 08, 2026', courier_name: 'Delhivery Surface', cod_available: false });
    expect(mockRate).toHaveBeenCalledTimes(2);
    expect(mockRate).toHaveBeenCalledWith(
      expect.objectContaining({ pickupPincode: '201301', deliveryPincode: GURUGRAM, lengthCm: 30, breadthCm: 20, heightCm: 8, declaredValue: 849 })
    );
    expect(mockRate).toHaveBeenCalledWith(expect.objectContaining({ cod: true }));
  });

  it('skips the COD question for a blocked pincode or a product sold prepaid only', async () => {
    await setSettings({ cod_enabled: true, cod_blocked_pincodes: [GURUGRAM] });
    const product = await seedShippable();
    mockRate.mockResolvedValue({ serviceable: true, courier_name: 'Xpressbees', courier_company_id: '3', freight_charge: 70, etd: '' });

    const out = await storeStorefrontService.deliveryCheck(String(product._id), '', GURUGRAM);

    expect(out).toMatchObject({ serviceable: true, cod_available: false, courier_name: 'Xpressbees' });
    expect(mockRate).toHaveBeenCalledTimes(1);
    expect(mockRate).toHaveBeenCalledWith(expect.not.objectContaining({ cod: true }));
  });

  it('reports a pincode the courier cannot reach, and treats a courier error as "could not check"', async () => {
    const product = await seedShippable();
    mockRate.mockResolvedValueOnce(null);
    expect(await storeStorefrontService.deliveryCheck(String(product._id), null, GURUGRAM)).toEqual({
      ...unchecked(GURUGRAM),
      checked: true,
    });

    mockRate.mockRejectedValueOnce(new Error('ShipRocket did not answer (serviceability) — try again shortly'));
    expect(await storeStorefrontService.deliveryCheck(String(product._id), null, GURUGRAM)).toEqual(unchecked(GURUGRAM));
  });

  it('prices a variant at its own price', async () => {
    const warehouse = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: 'DUN-WH-2', pincode: '201301' });
    const product = await seedProduct({
      pickup_location_id: warehouse._id,
      variant_option: 'Size',
      variants: [{ option_label: '10 kg', sku: 'V-10', unit_cost: 2499, inventory_count: 4, weight_kg: 10.4, length_cm: 60, breadth_cm: 40, height_cm: 15 }],
    });
    mockRate.mockResolvedValue({ serviceable: true, courier_name: 'Delhivery', courier_company_id: '1', freight_charge: 120, etd: '' });

    await storeStorefrontService.deliveryCheck(String(product._id), String(product.variants[0]._id), GURUGRAM);

    expect(mockRate).toHaveBeenCalledWith(expect.objectContaining({ declaredValue: 2499, lengthCm: 60, breadthCm: 40, heightCm: 15 }));
  });
});
