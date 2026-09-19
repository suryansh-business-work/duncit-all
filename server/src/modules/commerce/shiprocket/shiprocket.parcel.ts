/**
 * The parcel arithmetic ShipRocket bills by.
 *
 * A courier charges the HIGHER of the dead weight (what the scale reads) and
 * the volumetric weight (L × B × H in cm / 5000): a light toy in a big box
 * costs what the box would. Every rate lookup and every shipment we create goes
 * through here, so the weight we declare is the weight we are billed on — and
 * the one a weight dispute is checked against later.
 *
 * Twin of `parcel.ts` in `@duncit/utils` (the forms' live readout); the server
 * cannot import `@duncit/*` (rule 40), so the two formulas are kept in step by
 * their tests.
 */
export const VOLUMETRIC_DIVISOR = 5000;

/** A stack of boxes taller than this is not one parcel a courier takes. */
export const MAX_PARCEL_HEIGHT_CM = 120;

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const positive = (n: unknown) => Math.max(0, Number(n) || 0);

export interface ParcelDims {
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
}

export interface Parcel extends ParcelDims {
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
}

export interface ParcelLine extends ParcelDims {
  qty: number;
}

export const volumetricWeightKg = (length: number, breadth: number, height: number): number =>
  round3((positive(length) * positive(breadth) * positive(height)) / VOLUMETRIC_DIVISOR);

export const chargeableWeightKg = (d: ParcelDims): number =>
  round3(Math.max(positive(d.weight_kg), volumetricWeightKg(d.length_cm, d.breadth_cm, d.height_cm)));

/** A parcel's dimensions with the two weights a courier reads off them. */
export function withWeights(d: ParcelDims): Parcel {
  const dims = {
    weight_kg: round3(positive(d.weight_kg)),
    length_cm: round3(positive(d.length_cm)),
    breadth_cm: round3(positive(d.breadth_cm)),
    height_cm: round3(positive(d.height_cm)),
  };
  return {
    ...dims,
    volumetric_weight_kg: volumetricWeightKg(dims.length_cm, dims.breadth_cm, dims.height_cm),
    chargeable_weight_kg: chargeableWeightKg(dims),
  };
}

/**
 * One parcel for an order's lines, packed the way a warehouse packs them:
 * total weight is every unit's weight added up; the footprint is the largest
 * item's length and breadth; the height is the units stacked on top of each
 * other, capped at {@link MAX_PARCEL_HEIGHT_CM}.
 */
export function buildParcel(lines: readonly ParcelLine[]): Parcel {
  const units = lines.filter((line) => positive(line.qty) > 0);
  const sum = (pick: (line: ParcelLine) => number) =>
    units.reduce((total, line) => total + positive(line.qty) * positive(pick(line)), 0);
  const largest = (pick: (line: ParcelLine) => number) => Math.max(0, ...units.map((line) => positive(pick(line))));
  return withWeights({
    weight_kg: sum((line) => line.weight_kg),
    length_cm: largest((line) => line.length_cm),
    breadth_cm: largest((line) => line.breadth_cm),
    height_cm: Math.min(MAX_PARCEL_HEIGHT_CM, sum((line) => line.height_cm)),
  });
}
