import { describe, expect, it } from 'vitest';
import { productListingSchema } from './list-products.form';
import { makeProductListingSchema } from './list-products.schema';
import { toSubmitInput } from './list-products.map';
import type { ProductListingValues } from './list-products.types';

const validCategory = {
  super_id: '507f1f77bcf86cd799439011',
  super_name: 'Beverages',
  category_id: '507f1f77bcf86cd799439012',
  category_name: 'Coffee',
  sub_id: '507f1f77bcf86cd799439013',
  sub_name: 'Cold brew',
};

const validVariant = {
  option_label: 'Default / Medium',
  color: '#000000',
  size_label: 'Medium box',
  description: 'A complete cold brew kit for hosts to add to their pods.',
  image_urls: ['https://cdn.example.com/product.jpg'],
  height_cm: 24,
  weight_kg: 1.2,
  length_cm: 20,
  breadth_cm: 15,
  unit_cost: 499,
  inventory_count: 12,
};

const validListing = {
  categories: [validCategory],
  product_name: 'Cold brew kit',
  // The packed parcel every variant falls back to, and the tax slab.
  height_cm: 24,
  weight_kg: 1.2,
  length_cm: 20,
  breadth_cm: 15,
  hsn_code: '2309',
  tax_percent: 12,
  shelf_life_days: '',
  variants: [validVariant],
  commission_pct: 15,
  delivery_target: 'SHIPROCKET' as const,
  pickup_location_id: '507f1f77bcf86cd799439021',
  free_delivery_above: 999,
};

const messages = (result: ReturnType<typeof productListingSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('productListingSchema', () => {
  it('accepts a complete per-variant, multi-category listing', () => {
    expect(productListingSchema.safeParse(validListing).success).toBe(true);
  });

  it('rejects a missing product title', () => {
    const result = productListingSchema.safeParse({ ...validListing, product_name: '' });
    expect(messages(result)).toMatch(/product title/i);
  });

  it('requires at least one category row with a full Super/Category/Sub', () => {
    const empty = productListingSchema.safeParse({ ...validListing, categories: [] });
    expect(messages(empty)).toMatch(/at least one category/i);

    const partial = productListingSchema.safeParse({
      ...validListing,
      categories: [{ ...validCategory, sub_id: '' }],
    });
    expect(messages(partial)).toMatch(/super category, category and sub category/i);
  });

  it('requires each variant to carry an image and a long-enough description', () => {
    const noImage = productListingSchema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, image_urls: [] }],
    });
    expect(messages(noImage)).toMatch(/at least one image/i);

    const shortDesc = productListingSchema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, description: 'too short' }],
    });
    expect(messages(shortDesc)).toMatch(/at least 20 characters/i);
  });

  it('requires a positive per-variant price and stock', () => {
    const free = productListingSchema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, unit_cost: 0 }],
    });
    expect(messages(free)).toMatch(/price must be greater than 0/i);

    const blank = productListingSchema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, unit_cost: '', inventory_count: '' }],
    });
    expect(messages(blank)).toMatch(/enter the variant price/i);
    expect(messages(blank)).toMatch(/enter the variant stock/i);
  });

  it('requires a tax slab between 0 and 28 percent', () => {
    expect(productListingSchema.safeParse({ ...validListing, tax_percent: 29 }).success).toBe(false);
    expect(productListingSchema.safeParse({ ...validListing, tax_percent: -1 }).success).toBe(false);
    expect(productListingSchema.safeParse({ ...validListing, tax_percent: 0 }).success).toBe(true);
  });

  it('requires total stock across variants to be at least 1', () => {
    const result = productListingSchema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, inventory_count: 0 }],
    });
    expect(messages(result)).toMatch(/total stock/i);
  });

  it('requires commission within the allowed range', () => {
    const result = productListingSchema.safeParse({ ...validListing, commission_pct: 3 });
    expect(messages(result)).toMatch(/commission/i);
  });

  it('only accepts ShipRocket as the delivery option', () => {
    const result = productListingSchema.safeParse({ ...validListing, delivery_target: 'HOST' });
    expect(result.success).toBe(false);
  });

  it('requires a ship-from warehouse', () => {
    const result = productListingSchema.safeParse({ ...validListing, pickup_location_id: '' });
    expect(messages(result)).toMatch(/select a pickup address/i);
  });

  it('treats a blank free-delivery amount as no offer (null)', () => {
    const result = productListingSchema.safeParse({ ...validListing, free_delivery_above: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.free_delivery_above).toBeNull();
  });

  it('rejects a negative free-delivery amount', () => {
    const result = productListingSchema.safeParse({ ...validListing, free_delivery_above: -1 });
    expect(messages(result)).toMatch(/negative/i);
  });
});

describe('makeProductListingSchema packaging rules', () => {
  // The catalogue key stands in for the copy, so a message names its rule.
  const schema = makeProductListingSchema((key) => key);
  const keys = (result: ReturnType<typeof schema.safeParse>) =>
    result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);

  it('accepts a listing whose product parcel and HSN code are complete', () => {
    expect(schema.safeParse(validListing).success).toBe(true);
  });

  it('requires the product parcel and HSN code once the listing ships through ShipRocket', () => {
    const result = schema.safeParse({
      ...validListing,
      height_cm: '',
      weight_kg: '',
      length_cm: '',
      breadth_cm: '',
      hsn_code: '',
    });
    expect(keys(result)).toEqual(
      expect.arrayContaining([
        'weight_kg:partners.listProductsPage.weightRequired',
        'length_cm:partners.listProductsPage.lengthRequired',
        'breadth_cm:partners.listProductsPage.breadthRequired',
        'height_cm:partners.listProductsPage.heightRequired',
        'hsn_code:partners.listProductsPage.hsnRequired',
      ]),
    );
  });

  it('lets a variant leave its parcel blank (it ships with the product) but bounds a filled one', () => {
    const blank = schema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, height_cm: '', length_cm: '' }],
    });
    expect(blank.success).toBe(true);

    const tooHeavy = schema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, weight_kg: 51 }],
    });
    expect(keys(tooHeavy)).toContain('variants.0.weight_kg:partners.listProductsPage.weightRange');
  });

  it('rejects a malformed HSN code and an MRP below the price', () => {
    expect(keys(schema.safeParse({ ...validListing, hsn_code: '23' }))).toContain(
      'hsn_code:partners.listProductsPage.hsnFormat',
    );
    const mrp = schema.safeParse({ ...validListing, variants: [{ ...validVariant, mrp: 100 }] });
    expect(keys(mrp)).toContain('variants.0.mrp:partners.listProductsPage.mrpBelowPrice');
  });
});

describe('toSubmitInput free delivery', () => {
  // Mirror the real submit flow: the Zod resolver parses the raw form values
  // ('' becomes null) and toSubmitInput builds the mutation input from that.
  const submitValues = (free_delivery_above: number | string) =>
    productListingSchema.parse({ ...validListing, free_delivery_above }) as unknown as ProductListingValues;

  it('keeps a blank free-delivery amount as null in the input (never 0)', () => {
    const input = toSubmitInput(submitValues(''), 'brand-1');
    expect(input.free_delivery_above).toBeNull();
  });

  it('keeps an explicitly entered 0 free-delivery amount as 0', () => {
    const input = toSubmitInput(submitValues(0), 'brand-1');
    expect(input.free_delivery_above).toBe(0);
  });
});
