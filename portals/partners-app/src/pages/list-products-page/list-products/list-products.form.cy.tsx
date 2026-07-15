import { describe, expect, it } from 'vitest';
import { productListingSchema } from './list-products.form';

const validListing = {
  super_category_id: '507f1f77bcf86cd799439011',
  category_id: '507f1f77bcf86cd799439012',
  sub_category_id: '507f1f77bcf86cd799439013',
  product_name: 'Cold brew kit',
  image_urls: ['https://cdn.example.com/product.jpg'],
  description: 'A complete cold brew kit for hosts to add to their pods.',
  size_label: 'Medium box',
  height_cm: 24,
  weight_kg: 1.2,
  color: 'Black',
  inventory_count: 12,
  unit_cost: 499,
  commission_pct: 15,
  delivery_target: 'HOST',
};

const messages = (result: ReturnType<typeof productListingSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('productListingSchema', () => {
  it('rejects missing required product details', () => {
    const result = productListingSchema.safeParse({ ...validListing, product_name: '', image_urls: [] });
    expect(messages(result)).toMatch(/product title/i);
    expect(messages(result)).toMatch(/image/i);
  });

  it('requires commission in allowed range', () => {
    const result = productListingSchema.safeParse({ ...validListing, commission_pct: 3 });
    expect(messages(result)).toMatch(/commission/i);
  });

  it('requires the super, category and sub category', () => {
    const result = productListingSchema.safeParse({ ...validListing, super_category_id: '', category_id: '', sub_category_id: '' });
    expect(messages(result)).toMatch(/super category/i);
    expect(messages(result)).toMatch(/sub category/i);
  });

  it('rejects zero or negative inventory and price', () => {
    const result = productListingSchema.safeParse({ ...validListing, inventory_count: 0, unit_cost: 0 });
    expect(messages(result)).toMatch(/unit/i);
    expect(messages(result)).toMatch(/price/i);
  });

  it('accepts a complete product listing (variants optional, defaulting to [])', () => {
    const parsed = productListingSchema.safeParse(validListing);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.variants).toEqual([]);
  });

  it('accepts extra variants and validates their price/stock/name', () => {
    const ok = productListingSchema.safeParse({
      ...validListing,
      variants: [{ option_label: 'Red / L', color: '#ff0000', size_label: 'L', unit_cost: 599, inventory_count: 4, image_urls: [] }],
    });
    expect(ok.success).toBe(true);

    const bad = productListingSchema.safeParse({
      ...validListing,
      variants: [{ option_label: '', color: '#000000', size_label: '', unit_cost: 0, inventory_count: -1, image_urls: [] }],
    });
    expect(messages(bad)).toMatch(/variant name/i);
    expect(messages(bad)).toMatch(/price/i);
  });
});
