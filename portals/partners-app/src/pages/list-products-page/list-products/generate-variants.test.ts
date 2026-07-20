import { describe, expect, it } from 'vitest';
import { generateVariants, emptyVariant } from './list-products.map';
import type { ProductOptionValues, ProductVariantValues } from './list-products.types';

const opts = (over: Partial<ProductOptionValues>[] = []): ProductOptionValues[] =>
  over.map((o) => ({ name: o.name ?? '', values: o.values ?? [] }));

describe('generateVariants', () => {
  it('builds the cartesian product of every option value with a joined label', () => {
    const result = generateVariants(opts([{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Red', 'Blue'] }]), []);
    expect(result).toHaveLength(4);
    expect(result.map((v) => v.option_label)).toEqual(['S / Red', 'S / Blue', 'M / Red', 'M / Blue']);
    expect(result[0].option_values).toEqual([
      { name: 'Size', value: 'S' },
      { name: 'Colour', value: 'Red' },
    ]);
  });

  it('auto-fills size_label from a Size option value', () => {
    const [first] = generateVariants(opts([{ name: 'Size', values: ['XL'] }]), []);
    expect(first.size_label).toBe('XL');
  });

  it('preserves already-entered detail for combinations that still exist', () => {
    const existing: ProductVariantValues[] = [
      { ...emptyVariant, option_values: [{ name: 'Size', value: 'S' }], unit_cost: 499, description: 'kept' },
    ];
    const result = generateVariants(opts([{ name: 'Size', values: ['S', 'M'] }]), existing);
    expect(result).toHaveLength(2);
    expect(result[0].unit_cost).toBe(499);
    expect(result[0].description).toBe('kept');
    expect(result[1].unit_cost).toBe('');
  });

  it('ignores options with a blank name or no values', () => {
    const result = generateVariants(opts([{ name: '', values: ['x'] }, { name: 'Size', values: [] }]), []);
    expect(result).toEqual([{ ...emptyVariant }]);
  });

  it('keeps existing variants untouched when there are no options', () => {
    const existing: ProductVariantValues[] = [{ ...emptyVariant, option_label: 'Only' }];
    expect(generateVariants([], existing)).toBe(existing);
  });
});
