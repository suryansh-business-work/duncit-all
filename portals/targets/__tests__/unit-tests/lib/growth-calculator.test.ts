/**
 * The console's twin of the server formulas. The verification table here is
 * the same one the server suite pins, so the preview a planner sees and the
 * record the server saves can never disagree on the default plan.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GROWTH_INPUTS,
  GROWTH_INPUT_BOUNDS,
  GROWTH_INPUT_KEYS,
  computeGrowth,
  growthInputProblem,
  hasAtMostDecimals,
  paiseToRupees,
  type GrowthInputs,
} from '../../../src/lib/growth-calculator';

const plan = (over: Partial<GrowthInputs>): GrowthInputs => ({ ...DEFAULT_GROWTH_INPUTS, ...over });

describe('the default plan', () => {
  it('starts from the agreed defaults', () => {
    expect(DEFAULT_GROWTH_INPUTS).toEqual({
      pax_per_pod: 10,
      price_per_pax: 400,
      profit_margin_pct: 20,
      hosts_per_venue: 2,
      pods_per_host_per_month: 2,
      venues_per_city: 100,
      target_cities: 10,
      host_conversion_pct: 10,
      venue_conversion_pct: 5,
    });
  });

  it('reproduces the verification table', () => {
    const out = computeGrowth(DEFAULT_GROWTH_INPUTS);
    expect(out.per_pod).toEqual({ pod_value: '4000.00', earnings_per_pod: '800.00' });
    expect(out.per_city).toEqual({
      venues: 100,
      hosts: 200,
      monthly_pods: 400,
      monthly_gmv: '1600000.00',
      monthly_earnings: '320000.00',
      host_leads: 2000,
      venue_leads: 2000,
    });
    expect(out.totals).toEqual({
      cities: 10,
      venues: 1000,
      hosts: 2000,
      monthly_pods: 4000,
      host_leads: 20000,
      venue_leads: 20000,
      total_leads: 40000,
      monthly_gmv: '16000000.00',
      monthly_earnings: '3200000.00',
      annual_gmv: '192000000.00',
      annual_earnings: '38400000.00',
    });
  });
});

describe('the formulas', () => {
  it('counts monthly pods as venues × hosts per venue × pods per host', () => {
    expect(computeGrowth(plan({ venues_per_city: 10, hosts_per_venue: 3, pods_per_host_per_month: 4 })).per_city.monthly_pods).toBe(120);
  });

  it('keeps paise exact and rounds earnings per pod half up', () => {
    expect(computeGrowth(plan({ pax_per_pod: 7, price_per_pax: 399.99 })).per_pod.pod_value).toBe('2799.93');
    expect(computeGrowth(plan({ pax_per_pod: 3, price_per_pax: 0.33, profit_margin_pct: 50 })).per_pod.earnings_per_pod).toBe('0.50');
    expect(computeGrowth(plan({ pax_per_pod: 3, price_per_pax: 0.33, profit_margin_pct: 12.5 })).per_pod.earnings_per_pod).toBe('0.12');
  });

  it('rounds leads up to whole people', () => {
    const out = computeGrowth(plan({ venues_per_city: 7, hosts_per_venue: 1, host_conversion_pct: 30, venue_conversion_pct: 3 }));
    expect(out.per_city.host_leads).toBe(24);
    expect(out.per_city.venue_leads).toBe(234);
  });

  it('stays exact at the largest plan the bounds allow', () => {
    const max = Object.fromEntries(GROWTH_INPUT_KEYS.map((k) => [k, GROWTH_INPUT_BOUNDS[k].max])) as unknown as GrowthInputs;
    const out = computeGrowth({ ...max, host_conversion_pct: 0.01, venue_conversion_pct: 0.01 });
    expect(out.totals.monthly_gmv).toBe('10000000000000000000.00');
    expect(out.totals.annual_earnings).toBe('120000000000000000000.00');
    expect(out.totals.host_leads).toBe(10_000_000_000_000);
  });
});

describe('input checks', () => {
  it('tolerates float noise but not a third decimal', () => {
    expect(hasAtMostDecimals(399.99, 2)).toBe(true);
    expect(hasAtMostDecimals(0.1 + 0.2, 2)).toBe(true);
    expect(hasAtMostDecimals(400.005, 2)).toBe(false);
    expect(hasAtMostDecimals(2.5, 0)).toBe(false);
  });

  it('accepts each range end and names what is wrong just outside it', () => {
    for (const key of GROWTH_INPUT_KEYS) {
      const { min, max } = GROWTH_INPUT_BOUNDS[key];
      expect(growthInputProblem(key, min)).toBeNull();
      expect(growthInputProblem(key, max)).toBeNull();
      expect(growthInputProblem(key, max + 1)).toBe('range');
    }
    expect(growthInputProblem('host_conversion_pct', 0)).toBe('range');
    expect(growthInputProblem('hosts_per_venue', 2.5)).toBe('whole');
    expect(growthInputProblem('price_per_pax', 1.005)).toBe('decimals');
    expect(growthInputProblem('pax_per_pod', '10')).toBe('number');
    expect(growthInputProblem('pax_per_pod', Number.NaN)).toBe('number');
  });


  it('writes paise as a two-decimal rupee string', () => {
    expect(paiseToRupees(BigInt(5))).toBe('0.05');
    expect(paiseToRupees(BigInt(-250))).toBe('-2.50');
  });
});
