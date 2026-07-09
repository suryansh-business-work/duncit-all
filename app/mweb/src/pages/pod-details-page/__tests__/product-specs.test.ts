import { describe, expect, it } from 'vitest';
import { formatRupees, productSpecs } from '../product-specs';

describe('productSpecs', () => {
  it('builds only the rows that have a value', () => {
    expect(
      productSpecs({
        size_label: ' Large ',
        color: 'Black',
        weight_kg: 1.2,
        length_cm: 10,
        breadth_cm: 5,
        height_cm: 3,
      }),
    ).toEqual([
      { label: 'Size', value: 'Large' },
      { label: 'Color', value: 'Black' },
      { label: 'Weight', value: '1.2 kg' },
      { label: 'Dimensions', value: '10 × 5 × 3 cm' },
    ]);
  });

  it('skips empty/zero fields', () => {
    expect(productSpecs({})).toEqual([]);
    expect(productSpecs({ size_label: '  ', color: '', weight_kg: 0 })).toEqual([]);
    expect(productSpecs({ length_cm: 8 })).toEqual([
      { label: 'Dimensions', value: '8 × 0 × 0 cm' },
    ]);
  });
});

describe('formatRupees', () => {
  it('formats whole rupees and defaults to zero', () => {
    expect(formatRupees(1499)).toBe('₹1,499');
    expect(formatRupees(null)).toBe('₹0');
  });
});
