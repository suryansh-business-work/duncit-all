import { describe, expect, it } from 'vitest';
import {
  BLANK_COIN_SETTINGS,
  coinSettingsSchema,
  MAX_COIN_EXPIRY_DAYS,
  MAX_FLAT_COIN_REWARD,
  toCoinSettingsForm,
  type CoinSettingsForm,
} from '../../src/pages/finance/duncit-coin/coin-settings.schema';
import type { CoinSettings } from '../../src/pages/finance/duncit-coin/queries';

/** A saved payload, as `coinSettings` answers it. */
const saved: CoinSettings = {
  pod_join_earn_pct: 10,
  shop_earn_pct: 8,
  coins_per_referral: 50,
  pod_feedback_coins: 10,
  coin_expiry_days: 365,
  updated_at: '2026-08-25T00:00:00.000Z',
};

const form = (over: Partial<CoinSettingsForm> = {}): CoinSettingsForm => ({
  pod_join_earn_pct: '10',
  shop_earn_pct: '8',
  coins_per_referral: '50',
  pod_feedback_coins: '10',
  coin_expiry_days: '365',
  ...over,
});

/** The schema the page builds — with no translator it reads the shipped copy. */
const schema = coinSettingsSchema();

const errorFor = (values: CoinSettingsForm, field: keyof CoinSettingsForm) => {
  const parsed = schema.safeParse(values);
  if (parsed.success) return null;
  return parsed.error.issues.find((issue) => issue.path[0] === field)?.message ?? null;
};

describe('coin settings form', () => {
  it('turns every saved rate into a string, the feedback reward and expiry included', () => {
    expect(toCoinSettingsForm(saved)).toEqual(form());
  });

  it('reads a missing feedback reward as 0 rather than blanking the field', () => {
    const legacy = { ...saved, pod_feedback_coins: undefined as unknown as number };
    expect(toCoinSettingsForm(legacy).pod_feedback_coins).toBe('0');
  });

  it('starts blank in every field, so nothing is saved before it is loaded', () => {
    expect(BLANK_COIN_SETTINGS.pod_feedback_coins).toBe('');
    expect(BLANK_COIN_SETTINGS.coin_expiry_days).toBe('');
    expect(schema.safeParse(BLANK_COIN_SETTINGS).success).toBe(false);
  });

  it('names the field an empty value belongs to', () => {
    expect(errorFor(form({ pod_feedback_coins: '' }), 'pod_feedback_coins')).toBe(
      'Enter how many coins pod feedback pays.',
    );
    expect(errorFor(form({ coins_per_referral: '' }), 'coins_per_referral')).toBe(
      'Enter how many coins a referral pays.',
    );
    expect(errorFor(form({ shop_earn_pct: '' }), 'shop_earn_pct')).toBe('Enter the shop rate.');
  });

  it('accepts 0 — that is how Finance switches the feedback reward off', () => {
    expect(schema.safeParse(form({ pod_feedback_coins: '0' })).success).toBe(true);
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
      schema.safeParse(form({ pod_feedback_coins: String(MAX_FLAT_COIN_REWARD) })).success,
    ).toBe(true);
    expect(
      errorFor(form({ pod_feedback_coins: String(MAX_FLAT_COIN_REWARD + 1) }), 'pod_feedback_coins'),
    ).toContain('Keep the reward at or under');
  });

  it('keeps a percentage at or under 100', () => {
    expect(errorFor(form({ pod_join_earn_pct: '101' }), 'pod_join_earn_pct')).toBe(
      'A rate cannot go above 100%.',
    );
    expect(errorFor(form({ pod_join_earn_pct: '7.5' }), 'pod_join_earn_pct')).toContain(
      'Whole percents only',
    );
  });

  it('asks for the coin expiry in whole days, 0 meaning never, up to ten years', () => {
    expect(schema.safeParse(form({ coin_expiry_days: '0' })).success).toBe(true);
    expect(errorFor(form({ coin_expiry_days: '' }), 'coin_expiry_days')).toBe(
      'Enter how many days a granted coin lasts.',
    );
    expect(errorFor(form({ coin_expiry_days: '1.5' }), 'coin_expiry_days')).toBe(
      'Whole days only — digits, no decimals or symbols.',
    );
    expect(errorFor(form({ coin_expiry_days: String(MAX_COIN_EXPIRY_DAYS + 1) }), 'coin_expiry_days')).toBe(
      `Keep the expiry at or under ${MAX_COIN_EXPIRY_DAYS} days.`,
    );
  });

  it('words the expiry messages with the translator it is given', () => {
    const shout = (key: string) => key.toUpperCase();
    const parsed = coinSettingsSchema(shout).safeParse(form({ coin_expiry_days: '' }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('FINANCE.DUNCITCOIN.COINEXPIRYREQUIRED');
  });
});
