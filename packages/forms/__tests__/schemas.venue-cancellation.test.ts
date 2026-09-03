/**
 * The venue cancellation policy contract, which the Partners console used to
 * hold on its own with English literals for every refusal.
 *
 * The two rules worth pinning are the ones the server also enforces: a percent
 * above 100 charges more than the booking, and two bands on the same window
 * cannot both apply. Both are refused on the row, before a round trip.
 */
import { describe, expect, it } from 'vitest';

import {
  emptyTier,
  makeCancellationPolicySchema,
  toPolicyInput,
  toPolicyValues,
  type CancellationPolicyValues,
  type CancellationTierValues,
  type VenueCancellationPolicy,
} from '../src/schemas';

const t = (key: string) => key;
const schema = makeCancellationPolicySchema(t);

const band = (over: Partial<CancellationTierValues> = {}): CancellationTierValues => ({
  hours_before: '24',
  charge_type: 'PERCENT',
  value: '50',
  ...over,
});

const policy = (tiers: CancellationTierValues[], reschedule_only = false): CancellationPolicyValues => ({
  reschedule_only,
  tiers,
});

const issuesOf = (values: CancellationPolicyValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => [issue.path.join('.'), issue.message]);
};

describe('makeCancellationPolicySchema — a valid policy', () => {
  it('accepts a two-band policy and hands back numbers', () => {
    const parsed = schema.parse(policy([band(), band({ hours_before: '6', charge_type: 'AMOUNT', value: '500' })]));
    expect(parsed).toEqual({
      reschedule_only: false,
      tiers: [
        { hours_before: 24, charge_type: 'PERCENT', value: 50 },
        { hours_before: 6, charge_type: 'AMOUNT', value: 500 },
      ],
    });
  });

  it('accepts no bands at all — cancelling is then free at any time', () => {
    expect(schema.safeParse(policy([], true)).success).toBe(true);
  });

  it('lets a flat amount go past 100 — the ceiling is for percents only', () => {
    expect(issuesOf(policy([band({ charge_type: 'AMOUNT', value: '2500' })]))).toEqual([]);
  });
});

describe('makeCancellationPolicySchema — the window', () => {
  it('asks for the hours when the box holds no number', () => {
    expect(issuesOf(policy([band({ hours_before: 'soon' })]))).toEqual([
      ['tiers.0.hours_before', 'venueSettings.validation.hoursRequired'],
    ]);
  });

  it('refuses fractional hours', () => {
    expect(issuesOf(policy([band({ hours_before: '1.5' })]))).toEqual([
      ['tiers.0.hours_before', 'venueSettings.validation.wholeHours'],
    ]);
  });

  it('refuses a negative window', () => {
    expect(issuesOf(policy([band({ hours_before: '-1' })]))).toEqual([
      ['tiers.0.hours_before', 'venueSettings.validation.hoursNegative'],
    ]);
  });

  it('caps the window at a year', () => {
    expect(issuesOf(policy([band({ hours_before: '8761' })]))).toEqual([
      ['tiers.0.hours_before', 'venueSettings.validation.hoursMax'],
    ]);
    expect(issuesOf(policy([band({ hours_before: '8760' })]))).toEqual([]);
  });

  it('refuses a second band on a window another band already covers', () => {
    expect(issuesOf(policy([band(), band({ value: '20' })]))).toEqual([
      ['tiers.1.hours_before', 'venueSettings.validation.duplicateWindow'],
    ]);
  });
});

describe('makeCancellationPolicySchema — the charge', () => {
  it('asks for the charge when the box holds no number', () => {
    expect(issuesOf(policy([band({ value: 'half' })]))).toEqual([
      ['tiers.0.value', 'venueSettings.validation.chargeRequired'],
    ]);
  });

  it('refuses a negative charge', () => {
    expect(issuesOf(policy([band({ value: '-5' })]))).toEqual([
      ['tiers.0.value', 'venueSettings.validation.chargeNegative'],
    ]);
  });

  it('refuses a percent above 100, and reports it beside the duplicate window on the same row', () => {
    expect(issuesOf(policy([band(), band({ value: '150' })]))).toEqual([
      ['tiers.1.value', 'venueSettings.validation.percentMax'],
      ['tiers.1.hours_before', 'venueSettings.validation.duplicateWindow'],
    ]);
  });
});

describe('emptyTier', () => {
  it('is the common late-cancellation rule, held as strings for the inputs', () => {
    expect(emptyTier).toEqual({ hours_before: '24', charge_type: 'PERCENT', value: '50' });
  });
});

describe('toPolicyValues', () => {
  const saved: VenueCancellationPolicy = {
    reschedule_only: true,
    tiers: [{ hours_before: 48, charge_type: 'AMOUNT', value: 750 }],
  };

  it('turns the saved policy into what the inputs hold', () => {
    expect(toPolicyValues(saved)).toEqual({
      reschedule_only: true,
      tiers: [{ hours_before: '48', charge_type: 'AMOUNT', value: '750' }],
    });
  });

  it('edits an empty policy for a venue that has none yet', () => {
    const blank = { reschedule_only: false, tiers: [] };
    expect(toPolicyValues(null)).toEqual(blank);
    expect(toPolicyValues(undefined)).toEqual(blank);
  });
});

describe('toPolicyInput', () => {
  it('parses the values into the mutation input, keeping the bands under reschedule-only', () => {
    expect(toPolicyInput(policy([band({ hours_before: '12', value: '25' })], true), t)).toEqual({
      reschedule_only: true,
      tiers: [{ hours_before: 12, charge_type: 'PERCENT', value: 25 }],
    });
  });

  it('throws on a policy the schema refuses, so it never reaches the server', () => {
    expect(() => toPolicyInput(policy([band({ value: '150' })]), t)).toThrow(
      'venueSettings.validation.percentMax',
    );
  });
});
