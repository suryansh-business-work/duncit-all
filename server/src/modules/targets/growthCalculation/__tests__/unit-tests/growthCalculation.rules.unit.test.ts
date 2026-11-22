/**
 * The Growth Calculator formulas: the default plan must reproduce the
 * verification table exactly, money must stay exact at any size the bounds
 * allow, leads must round UP to whole people, and every invalid input — a zero
 * conversion rate above all — must be refused before it can divide anything.
 */
import {
  GROWTH_INPUT_BOUNDS,
  computeGrowth,
  growthInputIssues,
  paiseToRupees,
  validateGrowthInputs,
  type GrowthInputs,
} from '../../growthCalculation.rules';

const DEFAULTS: GrowthInputs = {
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

const plan = (over: Partial<GrowthInputs>): GrowthInputs => ({ ...DEFAULTS, ...over });

describe('the default plan', () => {
  const out = computeGrowth(DEFAULTS);

  it('matches the verification table per pod and per city', () => {
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
  });

  it('matches the verification table across all cities, monthly and annual', () => {
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
  it('counts monthly pods as venues × hosts per venue × pods per host, never venues × hosts alone', () => {
    const out = computeGrowth(plan({ venues_per_city: 10, hosts_per_venue: 3, pods_per_host_per_month: 4 }));
    expect(out.per_city.hosts).toBe(30);
    expect(out.per_city.monthly_pods).toBe(120);
  });

  it('keeps paise exact where floating point would drift', () => {
    // 0.1 + 0.2 territory: 3 pax × ₹0.10 is 30 paise, not 30.000000000000004.
    expect(computeGrowth(plan({ pax_per_pod: 3, price_per_pax: 0.1 })).per_pod.pod_value).toBe('0.30');
    expect(computeGrowth(plan({ pax_per_pod: 7, price_per_pax: 399.99 })).per_pod.pod_value).toBe('2799.93');
  });

  it('rounds earnings per pod half up to the paisa, and multiplies the rounded figure', () => {
    // 99 paise at 50% is 49.5 paise → 50; at 12.5% it is 12.375 → 12.
    const half = computeGrowth(plan({ pax_per_pod: 3, price_per_pax: 0.33, profit_margin_pct: 50 }));
    expect(half.per_pod.earnings_per_pod).toBe('0.50');
    expect(half.per_city.monthly_earnings).toBe('200.00'); // 400 pods × ₹0.50
    const down = computeGrowth(plan({ pax_per_pod: 3, price_per_pax: 0.33, profit_margin_pct: 12.5 }));
    expect(down.per_pod.earnings_per_pod).toBe('0.12');
  });

  it('rounds leads up to the next whole person', () => {
    const out = computeGrowth(plan({ venues_per_city: 7, hosts_per_venue: 1, host_conversion_pct: 30, venue_conversion_pct: 3 }));
    expect(out.per_city.host_leads).toBe(24); // 7 ÷ 0.30 = 23.33…
    expect(out.per_city.venue_leads).toBe(234); // 7 ÷ 0.03 = 233.33…
    expect(out.totals.total_leads).toBe((24 + 234) * 10);
  });

  it('needs exactly as many leads as partners at a 100% conversion rate', () => {
    const out = computeGrowth(plan({ host_conversion_pct: 100, venue_conversion_pct: 100 }));
    expect(out.per_city.host_leads).toBe(200);
    expect(out.per_city.venue_leads).toBe(100);
  });

  it('earns nothing at a zero margin or a free pod, without failing', () => {
    expect(computeGrowth(plan({ profit_margin_pct: 0 })).totals.annual_earnings).toBe('0.00');
    const free = computeGrowth(plan({ price_per_pax: 0 }));
    expect(free.totals.monthly_gmv).toBe('0.00');
    expect(free.totals.monthly_pods).toBe(4000);
  });

  it('stays exact at the largest plan the bounds allow', () => {
    const max = Object.fromEntries(
      Object.entries(GROWTH_INPUT_BOUNDS).map(([k, b]) => [k, b.max])
    ) as unknown as GrowthInputs;
    const out = computeGrowth({ ...max, host_conversion_pct: 0.01, venue_conversion_pct: 0.01 });
    // ₹1,00,000 × 1,000 pax = ₹10 crore a pod; 10^8 pods a city; 1,000 cities.
    expect(out.per_pod.pod_value).toBe('100000000.00');
    expect(out.totals.monthly_pods).toBe(100_000_000_000);
    expect(out.totals.monthly_gmv).toBe('10000000000000000000.00');
    expect(out.totals.annual_earnings).toBe('120000000000000000000.00');
    expect(out.totals.host_leads).toBe(10_000_000_000_000);
    expect(Number.isSafeInteger(out.totals.total_leads)).toBe(true);
  });
});

describe('validation', () => {
  it('accepts the default plan and both ends of every range', () => {
    expect(validateGrowthInputs(DEFAULTS)).toEqual(DEFAULTS);
    for (const [field, bound] of Object.entries(GROWTH_INPUT_BOUNDS)) {
      expect(growthInputIssues(plan({ [field]: bound.min }))).toEqual([]);
      expect(growthInputIssues(plan({ [field]: bound.max }))).toEqual([]);
    }
  });

  it('refuses a zero or negative conversion rate', () => {
    expect(growthInputIssues(plan({ host_conversion_pct: 0 }))).toEqual([
      { field: 'host_conversion_pct', message: 'host_conversion_pct must be between 0.01 and 100' },
    ]);
    expect(growthInputIssues(plan({ venue_conversion_pct: -5 })).map((i) => i.field)).toEqual(['venue_conversion_pct']);
  });

  it('refuses values just outside a range', () => {
    expect(growthInputIssues(plan({ pax_per_pod: 0 })).map((i) => i.field)).toEqual(['pax_per_pod']);
    expect(growthInputIssues(plan({ profit_margin_pct: 100.01 })).map((i) => i.field)).toEqual(['profit_margin_pct']);
    expect(growthInputIssues(plan({ target_cities: 1001 })).map((i) => i.field)).toEqual(['target_cities']);
  });

  it('refuses fractions of a count and more than two decimals of money', () => {
    expect(growthInputIssues(plan({ hosts_per_venue: 2.5 }))).toEqual([
      { field: 'hosts_per_venue', message: 'hosts_per_venue must be a whole number' },
    ]);
    expect(growthInputIssues(plan({ price_per_pax: 400.005 }))).toEqual([
      { field: 'price_per_pax', message: 'price_per_pax allows at most 2 decimal places' },
    ]);
  });

  it('refuses missing, non-numeric and non-finite values', () => {
    const missing: Partial<GrowthInputs> = { ...DEFAULTS };
    delete missing.venues_per_city;
    expect(growthInputIssues(missing).map((i) => i.field)).toEqual(['venues_per_city']);
    expect(growthInputIssues(plan({ pax_per_pod: '10' as unknown as number }))[0].message).toBe('pax_per_pod must be a number');
    expect(growthInputIssues(plan({ price_per_pax: Number.NaN })).map((i) => i.field)).toEqual(['price_per_pax']);
    expect(growthInputIssues(plan({ price_per_pax: Infinity })).map((i) => i.field)).toEqual(['price_per_pax']);
  });

  it('throws one BAD_USER_INPUT naming every field that failed', () => {
    let thrown: unknown;
    try {
      validateGrowthInputs(plan({ pax_per_pod: 0, host_conversion_pct: 0 }));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      message: 'pax_per_pod must be between 1 and 1000; host_conversion_pct must be between 0.01 and 100',
      extensions: { code: 'BAD_USER_INPUT', fields: ['pax_per_pod', 'host_conversion_pct'] },
    });
  });

  it('keeps only the known inputs', () => {
    const extra = { ...DEFAULTS, monthly_gmv: 999 } as unknown as GrowthInputs;
    expect(Object.keys(validateGrowthInputs(extra))).not.toContain('monthly_gmv');
  });
});

describe('paiseToRupees', () => {
  it('writes two decimals, pads single-digit paise and keeps a sign', () => {
    expect(paiseToRupees(BigInt(5))).toBe('0.05');
    expect(paiseToRupees(BigInt(123456))).toBe('1234.56');
    expect(paiseToRupees(BigInt(-250))).toBe('-2.50');
    expect(paiseToRupees(BigInt(0))).toBe('0.00');
  });
});
