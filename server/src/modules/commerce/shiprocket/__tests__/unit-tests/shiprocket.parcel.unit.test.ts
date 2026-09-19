import {
  MAX_PARCEL_HEIGHT_CM,
  VOLUMETRIC_DIVISOR,
  buildParcel,
  chargeableWeightKg,
  volumetricWeightKg,
  withWeights,
  type ParcelLine,
} from '../../shiprocket.parcel';

/**
 * The parcel arithmetic ShipRocket bills by. A wrong number here is a wrong
 * rate at checkout and a weight dispute after pickup, so every case below is
 * one a real pet-store basket produces.
 */

const jerky: ParcelLine = { qty: 1, weight_kg: 0.25, length_cm: 20, breadth_cm: 14, height_cm: 5 };
const kibble: ParcelLine = { qty: 1, weight_kg: 3.2, length_cm: 45, breadth_cm: 30, height_cm: 12 };

describe('volumetricWeightKg', () => {
  it('is length × breadth × height in cm over 5000', () => {
    expect(VOLUMETRIC_DIVISOR).toBe(5000);
    expect(volumetricWeightKg(30, 20, 10)).toBe(1.2);
  });

  it('rounds to the gram', () => {
    // 11 × 7 × 3 = 231 → 0.0462 kg
    expect(volumetricWeightKg(11, 7, 3)).toBe(0.046);
  });

  it('reads a negative or unreadable side as zero', () => {
    expect(volumetricWeightKg(-10, 20, 10)).toBe(0);
    expect(volumetricWeightKg(Number.NaN, 20, 10)).toBe(0);
  });
});

describe('chargeableWeightKg', () => {
  it('is the dead weight when the box is small and heavy', () => {
    // 45 × 30 × 12 / 5000 = 3.24 kg volumetric vs 3.5 kg on the scale
    expect(chargeableWeightKg({ weight_kg: 3.5, length_cm: 45, breadth_cm: 30, height_cm: 12 })).toBe(3.5);
  });

  it('is the volumetric weight when a light toy ships in a big box', () => {
    // 40 × 30 × 20 / 5000 = 4.8 kg for a 300 g plush
    expect(chargeableWeightKg({ weight_kg: 0.3, length_cm: 40, breadth_cm: 30, height_cm: 20 })).toBe(4.8);
  });

  it('is zero for a parcel with nothing entered', () => {
    expect(chargeableWeightKg({ weight_kg: 0, length_cm: 0, breadth_cm: 0, height_cm: 0 })).toBe(0);
  });
});

describe('withWeights', () => {
  it('rounds every value to three places and adds both weights', () => {
    expect(withWeights({ weight_kg: 1.23456, length_cm: 25, breadth_cm: 20, height_cm: 15 })).toEqual({
      weight_kg: 1.235,
      length_cm: 25,
      breadth_cm: 20,
      height_cm: 15,
      volumetric_weight_kg: 1.5,
      chargeable_weight_kg: 1.5,
    });
  });

  it('clamps negative values to zero rather than declaring them', () => {
    expect(withWeights({ weight_kg: -2, length_cm: -1, breadth_cm: 10, height_cm: 10 })).toMatchObject({
      weight_kg: 0,
      length_cm: 0,
      volumetric_weight_kg: 0,
      chargeable_weight_kg: 0,
    });
  });
});

describe('buildParcel', () => {
  it('adds up every unit’s weight', () => {
    const parcel = buildParcel([{ ...jerky, qty: 2 }, kibble]);
    // 2 × 0.25 + 3.2
    expect(parcel.weight_kg).toBe(3.7);
  });

  it('takes the largest length and the largest breadth across the lines', () => {
    const parcel = buildParcel([
      { ...jerky, length_cm: 20, breadth_cm: 32 },
      { ...kibble, length_cm: 45, breadth_cm: 30 },
    ]);
    expect(parcel.length_cm).toBe(45);
    expect(parcel.breadth_cm).toBe(32);
  });

  it('stacks the height of every unit', () => {
    const parcel = buildParcel([{ ...jerky, qty: 2 }, kibble]);
    // 2 × 5 + 12
    expect(parcel.height_cm).toBe(22);
  });

  it('caps a tall stack at 120 cm — one parcel, not a pallet', () => {
    const parcel = buildParcel([{ ...kibble, qty: 20 }]);
    expect(MAX_PARCEL_HEIGHT_CM).toBe(120);
    expect(parcel.height_cm).toBe(120);
    expect(parcel.weight_kg).toBe(64);
  });

  it('declares the volumetric and chargeable weight of the packed parcel', () => {
    const parcel = buildParcel([{ ...jerky, qty: 2 }]);
    // 20 × 14 × 10 / 5000 = 0.56 kg volumetric vs 0.5 kg dead
    expect(parcel).toEqual({
      weight_kg: 0.5,
      length_cm: 20,
      breadth_cm: 14,
      height_cm: 10,
      volumetric_weight_kg: 0.56,
      chargeable_weight_kg: 0.56,
    });
  });

  it('ignores a line with no units', () => {
    const parcel = buildParcel([{ ...kibble, qty: 0 }, jerky]);
    expect(parcel).toMatchObject({ weight_kg: 0.25, length_cm: 20, breadth_cm: 14, height_cm: 5 });
  });

  it('answers an empty parcel for no lines at all', () => {
    expect(buildParcel([])).toEqual({
      weight_kg: 0,
      length_cm: 0,
      breadth_cm: 0,
      height_cm: 0,
      volumetric_weight_kg: 0,
      chargeable_weight_kg: 0,
    });
  });
});
