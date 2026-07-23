import { describe, expect, it } from 'vitest';
import { productListingSchema } from './list-products.form';
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

  it('requires per-variant dimensions and price', () => {
    const result = productListingSchema.safeParse({
      ...validListing,
      variants: [{ ...validVariant, height_cm: '', length_cm: '', unit_cost: 0 }],
    });
    expect(messages(result)).toMatch(/height/i);
    expect(messages(result)).toMatch(/length/i);
    expect(messages(result)).toMatch(/price/i);
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
    expect(messages(result)).toMatch(/select a warehouse/i);
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
