import type { GraphQLError } from 'graphql';
import type { IProductVariant } from '../../inventory.model';
import {
  PACKAGING_LIMITS,
  assertMrp,
  effectiveDims,
  packagingMissing,
  parcelOf,
  validatePackagingInput,
} from '../../inventory.packaging';

/**
 * Packaging rules for a product that ships through ShipRocket. A draft may be
 * half-filled; a product on the store with ShipRocket delivery may not, and
 * the error has to name exactly what is missing — "packaging incomplete" sends
 * an operator hunting through four tabs.
 */

const variant = (over: Partial<IProductVariant> = {}): IProductVariant => ({
  option_label: '',
  option_values: [],
  sku: '',
  color: '',
  size_label: '',
  description: '',
  unit_cost: 349,
  mrp: 0,
  inventory_count: 10,
  images: [],
  height_cm: 0,
  breadth_cm: 0,
  length_cm: 0,
  weight_kg: 0,
  view_count: 0,
  click_count: 0,
  ...over,
});

const jerky = {
  product_name: 'Drools Chicken Jerky 200g',
  hsn_code: '2309',
  weight_kg: 0.25,
  length_cm: 20,
  breadth_cm: 14,
  height_cm: 5,
  variants: [] as IProductVariant[],
};

const ALL_DIMS = ['packed weight (kg)', 'length (cm)', 'breadth (cm)', 'height (cm)'];

/** The BAD_USER_INPUT message a call throws, or '' when it passes. */
function refusal(run: () => void): string {
  try {
    run();
    return '';
  } catch (error) {
    expect((error as GraphQLError).extensions?.code).toBe('BAD_USER_INPUT');
    return (error as Error).message;
  }
}

describe('effectiveDims', () => {
  it("takes the variant's own values and falls back to the product's for a zero", () => {
    expect(effectiveDims(jerky, { weight_kg: 1.2, length_cm: 0, breadth_cm: 30, height_cm: 0 })).toEqual({
      weight_kg: 1.2,
      length_cm: 20,
      breadth_cm: 30,
      height_cm: 5,
    });
  });

  it('reads the product alone when there is no variant', () => {
    expect(effectiveDims(jerky)).toEqual({ weight_kg: 0.25, length_cm: 20, breadth_cm: 14, height_cm: 5 });
  });
});

describe('packagingMissing', () => {
  it('is empty for a fully packed product', () => {
    expect(packagingMissing(jerky)).toEqual([]);
  });

  it('names the HSN code and every dimension that was never entered', () => {
    expect(
      packagingMissing({ ...jerky, hsn_code: '  ', weight_kg: 0, length_cm: 0, breadth_cm: 0, height_cm: 0 })
    ).toEqual(['HSN code', ...ALL_DIMS]);
  });

  it('counts a value under the courier minimum as missing', () => {
    const below = { weight_kg: PACKAGING_LIMITS.minWeightKg - 0.01, height_cm: PACKAGING_LIMITS.minSideCm - 0.1 };
    expect(packagingMissing({ ...jerky, ...below })).toEqual(['packed weight (kg)', 'height (cm)']);
  });

  it("lets a variant inherit the product's packaging", () => {
    expect(packagingMissing({ ...jerky, variants: [variant({ option_label: '200 g' })] })).toEqual([]);
  });

  it('names the variant whose own value is missing and has no fallback', () => {
    const bare = { ...jerky, height_cm: 0 };
    const variants = [
      variant({ option_label: '200 g', height_cm: 4 }),
      variant({ option_label: '500 g', weight_kg: 0.55 }),
    ];
    expect(packagingMissing({ ...bare, variants })).toEqual(['500 g: height (cm)']);
  });

  it('labels a variant by its SKU, then generically, when it has no option label', () => {
    const empty = { ...jerky, weight_kg: 0 };
    const variants = [variant({ sku: 'DRL-JRK-500' }), variant()];
    expect(packagingMissing({ ...empty, variants })).toEqual([
      'DRL-JRK-500: packed weight (kg)',
      'variant: packed weight (kg)',
    ]);
  });
});

describe('parcelOf', () => {
  it('is the variant parcel with both courier weights', () => {
    expect(parcelOf(jerky, { weight_kg: 0.3, length_cm: 40, breadth_cm: 30, height_cm: 20 })).toMatchObject({
      weight_kg: 0.3,
      volumetric_weight_kg: 4.8,
      chargeable_weight_kg: 4.8,
    });
  });
});

describe('assertMrp', () => {
  it.each([[undefined], [null], [0], [499], [599]])('accepts an MRP of %p on a ₹499 product', (mrp) => {
    expect(refusal(() => assertMrp(499, mrp))).toBe('');
  });

  it('refuses an MRP below the price, naming both', () => {
    expect(refusal(() => assertMrp(499, 399))).toBe('MRP (₹399) cannot be below the price (₹499)');
  });

  it("prefixes a variant's label", () => {
    expect(refusal(() => assertMrp(899, 799, '1 kg pack'))).toBe('1 kg pack: MRP (₹799) cannot be below the price (₹899)');
  });

  it.each([[-10], ['abc']])('refuses a negative or unreadable MRP (%p)', (mrp) => {
    expect(refusal(() => assertMrp(499, mrp))).toBe('MRP cannot be negative');
  });
});

describe('validatePackagingInput', () => {
  it('accepts a draft with nothing, or zeros, entered', () => {
    expect(refusal(() => validatePackagingInput({}))).toBe('');
    expect(refusal(() => validatePackagingInput({ weight_kg: 0, length_cm: '', height_cm: null }))).toBe('');
  });

  it.each([[0.05], [12], [50]])('accepts a packed weight of %p kg', (weight_kg) => {
    expect(refusal(() => validatePackagingInput({ weight_kg }))).toBe('');
  });

  it.each([[0.04], [51], ['heavy']])('refuses a packed weight of %p', (weight_kg) => {
    expect(refusal(() => validatePackagingInput({ weight_kg }))).toBe('Packed weight must be between 0.05 and 50 kg');
  });

  it('refuses a side outside 0.5–300 cm and names the variant', () => {
    expect(refusal(() => validatePackagingInput({ length_cm: 301 }))).toBe('length (cm) must be between 0.5 and 300 cm');
    expect(refusal(() => validatePackagingInput({ breadth_cm: 0.4 }, '1 kg pack'))).toBe(
      '1 kg pack: breadth (cm) must be between 0.5 and 300 cm'
    );
  });

  it('accepts only a known package type', () => {
    expect(refusal(() => validatePackagingInput({ package_type: 'POLYBAG' }))).toBe('');
    expect(refusal(() => validatePackagingInput({ package_type: 'CRATE' }))).toBe('Choose a package type');
  });

  it.each([['2309'], ['95030090'], [''], ['  ']])('accepts the HSN code %p', (hsn_code) => {
    expect(refusal(() => validatePackagingInput({ hsn_code }))).toBe('');
  });

  it.each([['230'], ['23A9'], ['123456789']])('refuses the HSN code %p', (hsn_code) => {
    expect(refusal(() => validatePackagingInput({ hsn_code }))).toMatch(/^HSN code is 4 to 8 digits/);
  });

  it.each([[0], [365], [3650]])('accepts a shelf life of %p days', (shelf_life_days) => {
    expect(refusal(() => validatePackagingInput({ shelf_life_days }))).toBe('');
  });

  it.each([[1.5], [-1], [3651]])('refuses a shelf life of %p days', (shelf_life_days) => {
    expect(refusal(() => validatePackagingInput({ shelf_life_days }))).toBe('Shelf life is a whole number of days');
  });
});
