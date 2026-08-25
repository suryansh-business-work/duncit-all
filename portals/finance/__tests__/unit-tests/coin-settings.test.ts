import { describe, expect, it } from 'vitest';
import {
  BLANK_COIN_SETTINGS,
  coinSettingsSchema,
  MAX_FLAT_COIN_REWARD,
  toCoinSettingsForm,
} from '../../src/pages/finance/duncit-coin/coin-settings.schema';

/** A saved payload, as `coinSettings` answers it. */
const saved = {
  pod_join_earn_pct: 10,
  shop_earn_pct: 8,
  coins_per_referral: 50,
  pod_feedback_coins: 10,
  updated_at: '2026-08-25T00:00:00.000Z',
};

const form = (over: Partial<Record<keyof typeof BLANK_COIN_SETTINGS, string>> = {}) => ({
  pod_join_earn_pct: '10',
  shop_earn_pct: '8',
  coins_per_referral: '50',
  pod_feedback_coins: '10',
  ...over,
});

const errorFor = (values: ReturnType<typeof form>, field: string) => {
  const parsed = coinSettingsSchema.safeParse(values);
  if (parsed.success) return null;
  return parsed.error.issues.find((issue) => issue.path[0] === field)?.message ?? null;
};

describe('coin settings form', () => {
  it('turns every saved rate into a string, the feedback reward included', () => {
    expect(toCoinSettingsForm(saved)).toEqual(form());
  });

  it('reads a missing feedback reward as 0 rather than blanking the field', () => {
    const legacy = { ...saved, pod_feedback_coins: undefined as unknown as number };
    expect(toCoinSettingsForm(legacy).pod_feedback_coins).toBe('0');
  });

  it('starts blank in every field, so nothing is saved before it is loaded', () => {
    expect(BLANK_COIN_SETTINGS.pod_feedback_coins).toBe('');
    expect(coinSettingsSchema.safeParse(BLANK_COIN_SETTINGS).success).toBe(false);
  });

  it('names the field an empty value belongs to', () => {
    expect(errorFor(form({ pod_feedback_coins: '' }), 'pod_feedback_coins')).toBe(
      'Enter how many coins pod feedback pays.',
    );
    expect(errorFor(form({ coins_per_referral: '' }), 'coins_per_referral')).toBe(
      'Enter how many coins a referral pays.',
    );
  });

  it('accepts 0 — that is how Finance switches the feedback reward off', () => {
    expect(coinSettingsSchema.safeParse(form({ pod_feedback_coins: '0' })).success).toBe(true);
  });

  it('rejects a fractional or signed reward', () => {
    expect(errorFor(form({ pod_feedback_coins: '10.5' }), 'pod_feedback_coins')).toContain(
      'Whole coins only',
    );
    expect(errorFor(form({ pod_feedback_coins: '-5' }), 'pod_feedback_coins')).toContain(
      'Whole coins only',
    );
  });

  it('holds the feedback reward under the same ceiling a referral has', () => {
    expect(
      coinSettingsSchema.safeParse(form({ pod_feedback_coins: String(MAX_FLAT_COIN_REWARD) }))
        .success,
    ).toBe(true);
    expect(
      errorFor(form({ pod_feedback_coins: String(MAX_FLAT_COIN_REWARD + 1) }), 'pod_feedback_coins'),
    ).toContain('Keep the reward at or under');
  });
});
