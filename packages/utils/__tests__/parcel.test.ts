import { describe, expect, it } from 'vitest';
import {
  PACKAGE_TYPES,
  PACKAGING_LIMITS,
  PACKAGING_PRESETS,
  VOLUMETRIC_DIVISOR,
  chargeableWeightKg,
  packagingGaps,
  parcelWeights,
  volumetricWeightKg,
} from '../src/parcel';

describe('volumetricWeightKg', () => {
  it('is L x B x H / 5000', () => {
    expect(VOLUMETRIC_DIVISOR).toBe(5000);
    expect(volumetricWeightKg(40, 28, 10)).toBe(2.24);
    expect(volumetricWeightKg(60, 40, 15)).toBe(7.2);
  });

  it('reads a missing or negative side as zero', () => {
    expect(volumetricWeightKg(0, 20, 10)).toBe(0);
    expect(volumetricWeightKg(-5, 20, 10)).toBe(0);
    expect(volumetricWeightKg(Number.NaN, 20, 10)).toBe(0);
  });
});

describe('chargeableWeightKg', () => {
  it('bills the packed weight when it is the heavier', () => {
    expect(chargeableWeightKg({ weight_kg: 3.2, length_cm: 40, breadth_cm: 28, height_cm: 10 })).toBe(3.2);
  });

  it('bills the volumetric weight when the box is the heavier', () => {
    // A 0.6 kg toy in a 30 × 20 × 15 box ships at the box's 1.8 kg.
    expect(chargeableWeightKg({ weight_kg: 0.6, length_cm: 30, breadth_cm: 20, height_cm: 15 })).toBe(1.8);
    expect(chargeableWeightKg({ weight_kg: 2.5, length_cm: 70, breadth_cm: 50, height_cm: 20 })).toBe(14);
  });
});

describe('parcelWeights', () => {
  it('flags a box that out-weighs its contents', () => {
    expect(parcelWeights({ weight_kg: 2.5, length_cm: 70, breadth_cm: 50, height_cm: 20 })).toEqual({
      volumetric: 14,
      chargeable: 14,
      boxHeavier: true,
    });
  });

  it('does not flag a dense parcel', () => {
    expect(parcelWeights({ weight_kg: 10.4, length_cm: 60, breadth_cm: 40, height_cm: 15 })).toEqual({
      volumetric: 7.2,
      chargeable: 10.4,
      boxHeavier: false,
    });
  });
});

describe('packagingGaps', () => {
  it('is empty for a complete parcel', () => {
    expect(packagingGaps({ weight_kg: 0.3, length_cm: 20, breadth_cm: 15, height_cm: 5 })).toEqual([]);
  });

  it('names every value that is missing or under the minimum', () => {
    expect(packagingGaps({})).toEqual(['weight_kg', 'length_cm', 'breadth_cm', 'height_cm']);
    expect(
      packagingGaps({ weight_kg: PACKAGING_LIMITS.minWeightKg / 2, length_cm: 10, breadth_cm: 0.2, height_cm: 3 })
    ).toEqual(['weight_kg', 'breadth_cm']);
  });
});

describe('PACKAGING_PRESETS', () => {
  it('are complete, uniquely named and use known package types', () => {
    expect(PACKAGING_PRESETS).toHaveLength(6);
    expect(new Set(PACKAGING_PRESETS.map((p) => p.id)).size).toBe(PACKAGING_PRESETS.length);
    for (const preset of PACKAGING_PRESETS) {
      expect(packagingGaps(preset), preset.id).toEqual([]);
      expect(PACKAGE_TYPES, preset.id).toContain(preset.package_type);
      expect(preset.labelKey.startsWith('packaging.preset.'), preset.id).toBe(true);
    }
  });

  it('carry the pack sizes the store ships most', () => {
    const byId = Object.fromEntries(PACKAGING_PRESETS.map((p) => [p.id, p]));
    expect(byId['food-bag-10']).toMatchObject({ length_cm: 60, breadth_cm: 40, height_cm: 15, weight_kg: 10.4 });
    expect(byId['small-pouch']).toMatchObject({ length_cm: 20, breadth_cm: 15, height_cm: 5, weight_kg: 0.3 });
  });
});
