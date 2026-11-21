/**
 * Growth Calculator — the one copy of the formulas.
 *
 * Turns nine planning assumptions (pax per pod, price per pax, Duncit's margin,
 * hosts per venue, pods per host, venues per city, cities and the two lead
 * conversion rates) into the targets the Targets console plans against: pods,
 * GMV and estimated earnings per pod, per city and across every city, plus the
 * host and venue leads needed to sign that many partners.
 *
 * Money never touches a float. Rupee inputs become whole paise, percentages
 * become basis points (hundredths of a percent), and every product is a BigInt,
 * so ₹3,84,00,000 is exactly that at any scale the bounds below allow. The only
 * rounding is the per-pod earnings, rounded half up to the paisa — so
 * "earnings = pods × earnings per pod" holds exactly.
 *
 * This file imports NOTHING. `node scripts/generate-growth-formula.mjs` copies
 * it into the Targets console (portals/targets/src/lib/generated/) for the
 * instant preview, and CI fails if that copy drifts — so the browser and the
 * server can never calculate differently. Saving always recalculates here;
 * nothing the browser computed is ever stored.
 */

/** Bumped when a formula changes, so a stored record says which rules made it. */
export const GROWTH_FORMULA_VERSION = 1;

/** The longest title and description a saved calculation may carry. */
export const GROWTH_TITLE_MAX = 120;
export const GROWTH_DESCRIPTION_MAX = 1000;

export interface GrowthInputs {
  pax_per_pod: number;
  price_per_pax: number;
  profit_margin_pct: number;
  hosts_per_venue: number;
  pods_per_host_per_month: number;
  venues_per_city: number;
  target_cities: number;
  host_conversion_pct: number;
  venue_conversion_pct: number;
}

export type GrowthInputKey = keyof GrowthInputs;

/** The plan every new calculation starts from. */
export const DEFAULT_GROWTH_INPUTS: Readonly<GrowthInputs> = {
  pax_per_pod: 10,
  price_per_pax: 400,
  profit_margin_pct: 20,
  hosts_per_venue: 2,
  pods_per_host_per_month: 2,
  venues_per_city: 100,
  target_cities: 10,
  host_conversion_pct: 10,
  venue_conversion_pct: 5,
};

/** The inclusive range each input accepts, and whether it may carry paise / hundredths. */
export interface GrowthBound {
  min: number;
  max: number;
  decimals: 0 | 2;
}

/**
 * Wide enough for any plan Duncit could make, narrow enough that every count
 * stays an exact JavaScript number (the largest, total host leads, peaks near
 * 10^13 — far under 2^53). Money is BigInt and has no such ceiling.
 */
export const GROWTH_INPUT_BOUNDS: Readonly<Record<GrowthInputKey, GrowthBound>> = {
  pax_per_pod: { min: 1, max: 1_000, decimals: 0 },
  price_per_pax: { min: 0, max: 100_000, decimals: 2 },
  profit_margin_pct: { min: 0, max: 100, decimals: 2 },
  hosts_per_venue: { min: 1, max: 100, decimals: 0 },
  pods_per_host_per_month: { min: 1, max: 100, decimals: 0 },
  venues_per_city: { min: 1, max: 10_000, decimals: 0 },
  target_cities: { min: 1, max: 1_000, decimals: 0 },
  // A zero rate would need infinitely many leads, so the floor is 0.01%.
  host_conversion_pct: { min: 0.01, max: 100, decimals: 2 },
  venue_conversion_pct: { min: 0.01, max: 100, decimals: 2 },
};

export const GROWTH_INPUT_KEYS = Object.keys(GROWTH_INPUT_BOUNDS) as GrowthInputKey[];

/** Money as a fixed two-decimal rupee string, e.g. "320000.00". */
export type Rupees = string;

export interface GrowthPerPod {
  pod_value: Rupees;
  earnings_per_pod: Rupees;
}

export interface GrowthPerCity {
  venues: number;
  hosts: number;
  monthly_pods: number;
  monthly_gmv: Rupees;
  monthly_earnings: Rupees;
  host_leads: number;
  venue_leads: number;
}

export interface GrowthTotals {
  cities: number;
  venues: number;
  hosts: number;
  monthly_pods: number;
  host_leads: number;
  venue_leads: number;
  total_leads: number;
  monthly_gmv: Rupees;
  monthly_earnings: Rupees;
  annual_gmv: Rupees;
  annual_earnings: Rupees;
}

export interface GrowthOutputs {
  per_pod: GrowthPerPod;
  per_city: GrowthPerCity;
  totals: GrowthTotals;
}

/** Whether `value` has no more than `decimals` places, tolerating float noise (399.99 × 100). */
export function hasAtMostDecimals(value: number, decimals: 0 | 2): boolean {
  const scaled = value * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** What is wrong with one input, or null when it is usable. */
export type GrowthInputProblem = 'number' | 'whole' | 'decimals' | 'range';

export function growthInputProblem(key: GrowthInputKey, value: unknown): GrowthInputProblem | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'number';
  const bound = GROWTH_INPUT_BOUNDS[key];
  if (!hasAtMostDecimals(value, bound.decimals)) return bound.decimals === 0 ? 'whole' : 'decimals';
  if (value < bound.min || value > bound.max) return 'range';
  return null;
}

/** Scale 100: paise from rupees, basis points from percent. */
const HUNDRED = BigInt(100);
const BASIS = BigInt(10_000);
const MONTHS = BigInt(12);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);

/** A two-decimal input as a whole number of hundredths (₹399.99 → 39999n). */
const hundredths = (value: number): bigint => BigInt(Math.round(value * 100));

/** Integer division rounded up — leads are whole people, and a fraction still needs one more. */
const ceilDiv = (num: bigint, den: bigint): bigint => (num + den - ONE) / den;

/** Integer division rounded half up (both operands are never negative here). */
const roundDiv = (num: bigint, den: bigint): bigint => (num * TWO + den) / (den * TWO);

/** Paise as a fixed two-decimal rupee string. */
export function paiseToRupees(paise: bigint): Rupees {
  const negative = paise < ZERO;
  const abs = negative ? -paise : paise;
  const fraction = (abs % HUNDRED).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${(abs / HUNDRED).toString()}.${fraction}`;
}

/**
 * Every target the inputs imply. `inputs` must already be valid (every
 * {@link growthInputProblem} null) — a zero conversion rate would divide by zero.
 */
export function computeGrowth(inputs: GrowthInputs): GrowthOutputs {
  const pax = BigInt(inputs.pax_per_pod);
  const pricePaise = hundredths(inputs.price_per_pax);
  const marginBasis = hundredths(inputs.profit_margin_pct);
  const cities = BigInt(inputs.target_cities);

  const podValue = pax * pricePaise;
  const earningsPerPod = roundDiv(podValue * marginBasis, BASIS);

  const venues = BigInt(inputs.venues_per_city);
  const hosts = venues * BigInt(inputs.hosts_per_venue);
  const monthlyPods = hosts * BigInt(inputs.pods_per_host_per_month);
  const monthlyGmv = monthlyPods * podValue;
  const monthlyEarnings = monthlyPods * earningsPerPod;
  // hosts ÷ (pct / 100) = hosts × 10,000 ÷ basis points, exactly.
  const hostLeads = ceilDiv(hosts * BASIS, hundredths(inputs.host_conversion_pct));
  const venueLeads = ceilDiv(venues * BASIS, hundredths(inputs.venue_conversion_pct));

  const totalMonthlyGmv = monthlyGmv * cities;
  const totalMonthlyEarnings = monthlyEarnings * cities;

  return {
    per_pod: { pod_value: paiseToRupees(podValue), earnings_per_pod: paiseToRupees(earningsPerPod) },
    per_city: {
      venues: Number(venues),
      hosts: Number(hosts),
      monthly_pods: Number(monthlyPods),
      monthly_gmv: paiseToRupees(monthlyGmv),
      monthly_earnings: paiseToRupees(monthlyEarnings),
      host_leads: Number(hostLeads),
      venue_leads: Number(venueLeads),
    },
    totals: {
      cities: Number(cities),
      venues: Number(venues * cities),
      hosts: Number(hosts * cities),
      monthly_pods: Number(monthlyPods * cities),
      host_leads: Number(hostLeads * cities),
      venue_leads: Number(venueLeads * cities),
      total_leads: Number((hostLeads + venueLeads) * cities),
      monthly_gmv: paiseToRupees(totalMonthlyGmv),
      monthly_earnings: paiseToRupees(totalMonthlyEarnings),
      annual_gmv: paiseToRupees(totalMonthlyGmv * MONTHS),
      annual_earnings: paiseToRupees(totalMonthlyEarnings * MONTHS),
    },
  };
}
