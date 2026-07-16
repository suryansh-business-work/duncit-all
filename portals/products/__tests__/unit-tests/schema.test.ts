import { describe, expect, it } from 'vitest';
import { productSchema } from '../../src/pages/inventory-page/inventory-product-page/schema';
import { blankProductForm } from '../../src/pages/inventory-page/inventory-product-page/types';

const valid = { ...blankProductForm, product_name: 'Cold Brew', unit_cost: 10 };

const messages = (input: unknown) => {
  const result = productSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('productSchema', () => {
  it('accepts a valid product', () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a product name', () => {
    expect(messages({ ...valid, product_name: '' })).toContain('Product name is required');
  });

  it('requires at least 2 characters in the product name', () => {
    expect(messages({ ...valid, product_name: 'A' })).toContain('At least 2 characters');
  });

  it('rejects a SKU with disallowed characters', () => {
    expect(messages({ ...valid, sku: 'ab_$' })).toContain(
      'SKU may contain only uppercase letters, digits and hyphens',
    );
  });

  it('rejects an invalid image url but allows an empty string', () => {
    expect(messages({ ...valid, image_url: 'not-a-url' })).toContain('Must be a valid URL');
    expect(productSchema.safeParse({ ...valid, image_url: '' }).success).toBe(true);
  });

  it('enforces max order qty >= min order qty via the cross-field refine', () => {
    expect(messages({ ...valid, min_order_qty: 10, max_order_qty: 5 })).toContain(
      'Max order qty must be ≥ min order qty',
    );
  });

  it('rejects a non-numeric unit cost', () => {
    expect(messages({ ...valid, unit_cost: Number.NaN })).toContain('Cost is required');
  });

  it('rejects more than 20 tags', () => {
    const tags = Array.from({ length: 21 }, (_v, i) => `t${i}`);
    expect(messages({ ...valid, tags })).toContain('At most 20 tags');
  });
});
