import { describe, expect, it } from 'vitest';
import { buildProductModerationInput, productViolationTarget } from './list-products.map';
import type { ProductListingValues } from './list-products.types';

const makeVariant = (over: Record<string, unknown>) => ({
  option_label: '',
  color: '#000000',
  size_label: '',
  description: '',
  image_urls: [] as string[],
  height_cm: 1,
  weight_kg: 1,
  length_cm: 1,
  breadth_cm: 1,
  unit_cost: 1,
  inventory_count: 1,
  ...over,
});

describe('buildProductModerationInput', () => {
  it('collects product name + variant text + the deduped union of variant images', () => {
    const values = {
      categories: [],
      product_name: 'Kit',
      commission_pct: 15,
      delivery_target: 'SHIPROCKET',
      variants: [
        makeVariant({ option_label: 'A', size_label: 'M', description: 'desc a', image_urls: ['x', 'y'] }),
        makeVariant({ option_label: 'B', size_label: 'L', description: 'desc b', image_urls: ['y', 'z'] }),
      ],
    } as unknown as ProductListingValues;
    const out = buildProductModerationInput(values);
    expect(out.product_name).toBe('Kit');
    expect(out.variants).toEqual([
      { option_label: 'A', size_label: 'M', description: 'desc a' },
      { option_label: 'B', size_label: 'L', description: 'desc b' },
    ]);
    expect(out.image_urls).toEqual(['x', 'y', 'z']);
  });
});

describe('productViolationTarget', () => {
  it('maps product_name to the Product step with its path', () => {
    expect(productViolationTarget('product_name')).toEqual({ stepIndex: 1, path: 'product_name' });
  });

  it('maps a variant field to the Variants step keeping its RHF path', () => {
    expect(productViolationTarget('variants.2.description')).toEqual({ stepIndex: 2, path: 'variants.2.description' });
  });

  it('maps generic AI fields (description/image) to the Variants step with no path', () => {
    expect(productViolationTarget('description')).toEqual({ stepIndex: 2, path: null });
    expect(productViolationTarget('image')).toEqual({ stepIndex: 2, path: null });
  });

  it('falls back to the Product step for unknown fields', () => {
    expect(productViolationTarget('whatever')).toEqual({ stepIndex: 1, path: null });
  });
});
