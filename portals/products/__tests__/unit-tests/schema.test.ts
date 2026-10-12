import { describe, expect, it } from 'vitest';
import { makeProductSchema, productSchema } from '../../src/pages/inventory-page/inventory-product-page/schema';
import { blankProductForm } from '../../src/pages/inventory-page/inventory-product-page/types';

const valid = { ...blankProductForm, product_name: 'Cold Brew', unit_cost: 10, pickup_location_id: 'wh1' };

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

  it('defaults undefined order quantities to 0 in the cross-field refine', () => {
    // max/min undefined exercise the `?? 0` fallbacks in the superRefine.
    const result = productSchema.safeParse({
      ...valid,
      min_order_qty: undefined,
      max_order_qty: undefined,
    });
    // Both coerce to 0, so 0 < 0 is false — the refine does not add its issue.
    const refineIssue = result.success
      ? undefined
      : result.error.issues.find((i) => i.message.includes('Max order qty'));
    expect(refineIssue).toBeUndefined();
  });

  it('rejects more than 20 tags', () => {
    const tags = Array.from({ length: 21 }, (_v, i) => `t${i}`);
    expect(messages({ ...valid, tags })).toContain('At most 20 tags');
  });

  it('requires a warehouse (pickup location) on a Duncit product', () => {
    expect(messages({ ...valid, pickup_location_id: '' })).toContain('Pickup address is required');
  });

  it('does not require a warehouse on a brand-owned product', () => {
    // A brand product ships from the brand's own warehouse, which this form
    // never lists, so the field must stay optional there.
    const result = productSchema.safeParse({
      ...valid,
      ownership: 'BRAND',
      pickup_location_id: '',
    });
    expect(result.success).toBe(true);
  });

  it('reads a blank shelf life as "does not expire" and a typed one as a number', () => {
    const shelfLife = (value: unknown) => {
      const result = productSchema.safeParse({ ...valid, shelf_life_days: value });
      return result.success ? result.data.shelf_life_days : 'invalid';
    };
    expect(shelfLife('')).toBeNull();
    expect(shelfLife(null)).toBeNull();
    expect(shelfLife(undefined)).toBeNull();
    expect(shelfLife('45')).toBe(45);
    expect(shelfLife(30)).toBe(30);
    expect(shelfLife('abc')).toBe('invalid');
  });
});

describe('makeProductSchema', () => {
  const t = (key: string) => key;
  const full = {
    ...valid,
    brand_name: 'Acme',
    delivery_target: 'DUNCIT',
    mrp: 0,
  };

  it('adds the catalogue rules on top of the structural schema', () => {
    const result = makeProductSchema(t).safeParse({ ...full, brand_name: ' ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain('products.validation.brandRequired');
  });

  it('still reports the catalogue rules when another field has a type error', () => {
    const result = makeProductSchema(t).safeParse({ ...full, brand_name: '', unit_cost: 'x' });
    const messages = result.error?.issues.map((i) => i.message) ?? [];
    expect(messages).toContain('Cost is required');
    expect(messages).toContain('products.validation.brandRequired');
  });

  it('does not run the catalogue rules on a non-object payload', () => {
    const result = makeProductSchema(t).safeParse('not an object');
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).not.toContain('products.validation.brandRequired');
  });
});
