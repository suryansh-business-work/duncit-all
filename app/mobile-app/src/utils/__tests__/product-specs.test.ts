import { formatRupees, productSpecs } from '@/utils/product-specs';

describe('productSpecs', () => {
  it('builds only the rows that have a value', () => {
    const specs = productSpecs({
      size_label: ' Large ',
      color: 'Black',
      weight_kg: 1.2,
      length_cm: 10,
      breadth_cm: 5,
      height_cm: 3,
    });
    expect(specs).toEqual([
      { label: 'Size', value: 'Large' },
      { label: 'Color', value: 'Black' },
      { label: 'Weight', value: '1.2 kg' },
      { label: 'Dimensions', value: '10 × 5 × 3 cm' },
    ]);
  });

  it('skips empty/zero fields and coalesces missing dimensions', () => {
    expect(productSpecs({})).toEqual([]);
    expect(productSpecs({ size_label: '   ', color: '', weight_kg: 0 })).toEqual([]);
    // Only one dimension present → the others coalesce to 0 in the label.
    expect(productSpecs({ length_cm: 8 })).toEqual([
      { label: 'Dimensions', value: '8 × 0 × 0 cm' },
    ]);
    expect(productSpecs({ weight_kg: null, height_cm: null })).toEqual([]);
    // Explicit zero dimensions (non-nullish but not positive) are also skipped.
    expect(productSpecs({ length_cm: 0, breadth_cm: 0, height_cm: 0 })).toEqual([]);
  });
});

describe('formatRupees', () => {
  it('formats whole rupees with grouping and defaults to zero', () => {
    expect(formatRupees(1499)).toBe('₹1,499');
    expect(formatRupees(0)).toBe('₹0');
    expect(formatRupees(null)).toBe('₹0');
    expect(formatRupees()).toBe('₹0');
  });
});
