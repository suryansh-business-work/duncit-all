import {
  brandOut,
  categoryAdminOut,
  collectionOut,
  facetOut,
  occasionOut,
  pageOut,
  petTypeOut,
  sectionOut,
} from '../../store.admin.merch.service';

/**
 * The portal reads the store's shape from lean documents, so a row written
 * before a field existed arrives without it. Each mapper must answer every
 * field with a safe default for such a row, and pass a stored value through.
 */

const when = new Date('2026-10-01T08:00:00.000Z');

describe('pet types', () => {
  it('defaults every field of a bare row and keeps the categories it is given', () => {
    expect(petTypeOut({ _id: 'p1', name: 'Dog', slug: 'dog' }, ['c1'])).toEqual({
      id: 'p1',
      name: 'Dog',
      slug: 'dog',
      icon_url: '',
      image_url: '',
      description: '',
      sort_order: 0,
      is_active: true,
      category_ids: ['c1'],
    });
  });

  it('passes stored values through, and reads is_active=false as off', () => {
    const out = petTypeOut({ _id: 'p2', name: 'Cat', slug: 'cat', icon_url: 'i', image_url: 'm', description: 'd', sort_order: 3, is_active: false });
    expect(out).toMatchObject({ icon_url: 'i', image_url: 'm', description: 'd', sort_order: 3, is_active: false, category_ids: [] });
  });
});

describe('pages', () => {
  it('defaults a bare page: footer and active on, empty copy, blank time', () => {
    expect(pageOut({ _id: 'g1', title: 'Shipping', slug: 'shipping' })).toEqual({
      id: 'g1',
      title: 'Shipping',
      slug: 'shipping',
      content_html: '',
      show_in_footer: true,
      is_active: true,
      sort_order: 0,
      seo_title: '',
      seo_description: '',
      updated_at: '',
    });
  });

  it('passes a stored page through', () => {
    const out = pageOut({
      _id: 'g2',
      title: 'T',
      slug: 't',
      content_html: '<p>x</p>',
      show_in_footer: false,
      is_active: false,
      sort_order: 2,
      seo_title: 's',
      seo_description: 'sd',
      updated_at: when,
    });
    expect(out).toMatchObject({ content_html: '<p>x</p>', show_in_footer: false, is_active: false, sort_order: 2, updated_at: when.toISOString() });
  });
});

describe('occasions', () => {
  const base = { slug: 'diwali', label: 'Diwali', starts_at: when, ends_at: new Date('2026-10-05T00:00:00.000Z') };

  it('blanks the optional fields of a bare occasion', () => {
    const out = occasionOut({ ...base } as never);
    expect(out).toMatchObject({
      starts_at: when.toISOString(),
      logo_url: '',
      favicon_url: '',
      background_url: '',
      background_color: '',
      announcement_text: '',
      is_active: true,
      sort_order: 0,
      theme: 'NONE',
      effects_enabled: true,
      greeting: '',
    });
  });

  it('keeps a configured occasion and its off switch', () => {
    const out = occasionOut({
      ...base,
      logo_url: 'l',
      favicon_url: 'f',
      background_url: 'b',
      background_color: '#FFF',
      announcement_text: 'Sale',
      is_active: false,
      sort_order: 4,
      theme: 'DIWALI',
      effects_enabled: false,
      greeting: 'Happy Diwali',
    } as never);
    expect(out).toMatchObject({ logo_url: 'l', background_color: '#FFF', announcement_text: 'Sale', is_active: false, sort_order: 4 });
    expect(out).toMatchObject({ theme: 'DIWALI', effects_enabled: false, greeting: 'Happy Diwali' });
  });
});

describe('brands, categories and filters', () => {
  it('defaults a bare brand, and keeps a configured one', () => {
    expect(brandOut({ _id: 'b1', name: 'Drools', slug: 'drools' })).toMatchObject({ logo_url: '', tagline: '', description: '', sort_order: 0, is_active: true });
    expect(brandOut({ _id: 'b2', name: 'X', slug: 'x', logo_url: 'l', tagline: 't', description: 'd', sort_order: 5, is_active: false })).toMatchObject({
      logo_url: 'l',
      tagline: 't',
      description: 'd',
      sort_order: 5,
      is_active: false,
    });
  });

  it('defaults a bare category: top level, no pets, shown in the menu', () => {
    expect(categoryAdminOut({ _id: 'c1', name: 'Food', slug: 'food' })).toEqual({
      id: 'c1',
      name: 'Food',
      slug: 'food',
      parent_id: null,
      image_url: '',
      banner_url: '',
      description: '',
      pet_type_ids: [],
      sort_order: 0,
      is_active: true,
      show_in_menu: true,
      seo_title: '',
      seo_description: '',
    });
  });

  it('keeps a configured category as text ids', () => {
    const out = categoryAdminOut({
      _id: 'c2',
      name: 'Dry',
      slug: 'dry',
      parent_id: 'c1',
      image_url: 'i',
      banner_url: 'b',
      description: 'd',
      pet_type_ids: ['p1', 'p2'],
      sort_order: 2,
      is_active: false,
      show_in_menu: false,
      seo_title: 't',
      seo_description: 's',
    });
    expect(out).toMatchObject({ parent_id: 'c1', pet_type_ids: ['p1', 'p2'], is_active: false, show_in_menu: false, seo_title: 't' });
  });

  it('defaults a bare filter and keeps a configured one’s options', () => {
    expect(facetOut({ _id: 'f1', name: 'Size', slug: 'size' })).toMatchObject({ options: [], sort_order: 0, is_active: true });
    expect(facetOut({ _id: 'f2', name: 'Size', slug: 'size', options: [{ label: 'S', slug: 's', extra: 1 }], sort_order: 1, is_active: false })).toMatchObject({
      options: [{ label: 'S', slug: 's' }],
      sort_order: 1,
      is_active: false,
    });
  });
});

describe('collections', () => {
  it('defaults a bare collection and its rules', () => {
    const out = collectionOut({ _id: 'k1', name: 'Sale', slug: 'sale', mode: 'MANUAL' });
    expect(out).toMatchObject({
      description: '',
      image_url: '',
      banner_url: '',
      product_ids: [],
      sort_order: 0,
      is_active: true,
      seo_title: '',
      seo_description: '',
      rules: {
        pet_type_ids: [],
        category_ids: [],
        brand_ids: [],
        tags: [],
        min_discount_pct: 0,
        max_price: 0,
        featured_only: false,
        in_stock_only: false,
      },
    });
  });

  it('keeps configured rules', () => {
    const out = collectionOut({
      _id: 'k2',
      name: 'Smart',
      slug: 'smart',
      mode: 'SMART',
      description: 'd',
      image_url: 'i',
      banner_url: 'b',
      product_ids: ['a'],
      rules: {
        pet_type_ids: ['p'],
        category_ids: ['c'],
        brand_ids: ['b'],
        tags: ['grain-free'],
        min_discount_pct: 20,
        max_price: 999,
        featured_only: true,
        in_stock_only: true,
      },
      sort_order: 2,
      is_active: false,
      seo_title: 't',
      seo_description: 's',
    });
    expect(out.rules).toEqual({
      pet_type_ids: ['p'],
      category_ids: ['c'],
      brand_ids: ['b'],
      tags: ['grain-free'],
      min_discount_pct: 20,
      max_price: 999,
      featured_only: true,
      in_stock_only: true,
    });
    expect(out).toMatchObject({ product_ids: ['a'], is_active: false, seo_title: 't' });
  });
});

describe('home sections', () => {
  it('defaults a bare section: twelve products from a collection, no window', () => {
    expect(sectionOut({ _id: 's1', kind: 'BRANDS' })).toEqual({
      id: 's1',
      kind: 'BRANDS',
      title: '',
      subtitle: '',
      items: [],
      collection_id: null,
      category_ids: [],
      product_limit: 12,
      discount_tiers: [],
      product_source: 'COLLECTION',
      product_ids: [],
      sort_order: 0,
      is_active: true,
      starts_at: null,
      ends_at: null,
    });
  });

  it('keeps a configured section and defaults a bare item', () => {
    const out = sectionOut({
      _id: 's2',
      kind: 'FLASH_SALE',
      title: 'T',
      subtitle: 'S',
      items: [{ _id: 'i1', eyebrow: 'g', title: 'a', subtitle: 'b', image_url: 'c', mobile_image_url: 'd', cta_label: 'e', link: 'f' }, {}],
      collection_id: 'k1',
      category_ids: ['c1'],
      product_limit: 6,
      discount_tiers: [10, 20],
      product_source: 'MANUAL',
      product_ids: ['p1'],
      sort_order: 3,
      is_active: false,
      starts_at: when,
      ends_at: when,
    });
    expect(out.items[0]).toEqual({ id: 'i1', eyebrow: 'g', title: 'a', subtitle: 'b', image_url: 'c', mobile_image_url: 'd', cta_label: 'e', link: 'f' });
    expect(out.items[1]).toEqual({ id: '', eyebrow: '', title: '', subtitle: '', image_url: '', mobile_image_url: '', cta_label: '', link: '' });
    expect(out).toMatchObject({
      collection_id: 'k1',
      product_limit: 6,
      discount_tiers: [10, 20],
      product_source: 'MANUAL',
      is_active: false,
      starts_at: when.toISOString(),
      ends_at: when.toISOString(),
    });
  });
});
