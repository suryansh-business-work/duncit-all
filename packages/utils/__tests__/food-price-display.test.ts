import { describe, expect, it, vi } from 'vitest';
import {
  FOOD_CURRENCY_QUERY,
  FOOD_SAVING_DISPLAYS,
  foodPriceDisplay,
  foodSavingLabel,
} from '../src/food-price-display';

const rupees = (amount: number) => `₹${amount}`;
const translate = () =>
  vi.fn((key: string, options?: { vars?: Record<string, string | number> }) => `${key}:${JSON.stringify(options?.vars)}`);

describe('foodPriceDisplay', () => {
  it('strikes the original through and reads the saving as a percent by default', () => {
    expect(foodPriceDisplay({ price: 160, original_price: 200 })).toEqual({
      price: 160,
      originalPrice: 200,
      saving: { mode: 'PERCENT', pct: 20 },
    });
  });

  it('reads the saving as an amount when the dish asks for it', () => {
    expect(foodPriceDisplay({ price: 160, original_price: 200, saving_display: 'AMOUNT' })).toEqual({
      price: 160,
      originalPrice: 200,
      saving: { mode: 'AMOUNT', amount: 40 },
    });
  });

  it('rounds the percent DOWN so the label never promises more than the guest saves', () => {
    // 1/3 off is 33.33…%, read as 33.
    expect(foodPriceDisplay({ price: 200, original_price: 300 }).saving).toEqual({ mode: 'PERCENT', pct: 33 });
    // 29.9% off is 29, not 30.
    expect(foodPriceDisplay({ price: 70.1, original_price: 100 }).saving).toEqual({ mode: 'PERCENT', pct: 29 });
  });

  it('reads a saving that rounds to 0% as the amount, rounded to the paisa', () => {
    expect(foodPriceDisplay({ price: 999.5, original_price: 1000 }).saving).toEqual({ mode: 'AMOUNT', amount: 0.5 });
    expect(foodPriceDisplay({ price: 10.1, original_price: 10.2 }).saving).toEqual({ mode: 'AMOUNT', amount: 0.1 });
  });

  it('reads prices still typed as text in the editor', () => {
    expect(foodPriceDisplay({ price: ' 160 ', original_price: '200' })).toEqual({
      price: 160,
      originalPrice: 200,
      saving: { mode: 'PERCENT', pct: 20 },
    });
  });

  it('strikes nothing when the original is missing, blank, unreadable or not above the price', () => {
    const none = { price: 160, originalPrice: null, saving: null };
    expect(foodPriceDisplay({ price: 160 })).toEqual(none);
    expect(foodPriceDisplay({ price: 160, original_price: null })).toEqual(none);
    expect(foodPriceDisplay({ price: 160, original_price: '' })).toEqual(none);
    expect(foodPriceDisplay({ price: 160, original_price: '  ' })).toEqual(none);
    expect(foodPriceDisplay({ price: 160, original_price: 'abc' })).toEqual(none);
    expect(foodPriceDisplay({ price: 160, original_price: 160 })).toEqual(none);
    expect(foodPriceDisplay({ price: 160, original_price: 120 })).toEqual(none);
    expect(foodPriceDisplay({ price: 160, original_price: Number.POSITIVE_INFINITY })).toEqual(none);
  });

  it('strikes nothing on a free or negative price', () => {
    expect(foodPriceDisplay({ price: 0, original_price: 100 })).toEqual({ price: 0, originalPrice: null, saving: null });
    expect(foodPriceDisplay({ price: -5, original_price: 100 })).toEqual({ price: -5, originalPrice: null, saving: null });
  });

  it('reads an unreadable price as 0 and strikes nothing', () => {
    expect(foodPriceDisplay({ price: '', original_price: 100 })).toEqual({ price: 0, originalPrice: null, saving: null });
    expect(foodPriceDisplay({ price: 'abc', original_price: 100 })).toEqual({ price: 0, originalPrice: null, saving: null });
    expect(foodPriceDisplay({ price: Number.NaN, original_price: 100 })).toEqual({ price: 0, originalPrice: null, saving: null });
  });

  it('treats an unknown display mode as the percent', () => {
    expect(foodPriceDisplay({ price: 50, original_price: 100, saving_display: 'BOGUS' }).saving).toEqual({
      mode: 'PERCENT',
      pct: 50,
    });
    expect(FOOD_SAVING_DISPLAYS).toEqual(['PERCENT', 'AMOUNT']);
  });
});

describe('foodSavingLabel', () => {
  it('is empty when there is no saving, without translating anything', () => {
    const t = translate();
    expect(foodSavingLabel(t, null, rupees)).toBe('');
    expect(t).not.toHaveBeenCalled();
  });

  it('reads a percent with the guest key by default', () => {
    const t = translate();
    expect(foodSavingLabel(t, { mode: 'PERCENT', pct: 20 }, rupees)).toBe('mweb.venueFood.savingPercent:{"pct":20}');
  });

  it('reads an amount in the surface currency with the guest key', () => {
    const t = translate();
    const money = vi.fn(rupees);
    expect(foodSavingLabel(t, { mode: 'AMOUNT', amount: 40 }, money)).toBe('mweb.venueFood.savingAmount:{"amount":"₹40"}');
    expect(money).toHaveBeenCalledWith(40);
  });

  it('reads the owner keys for the editor preview', () => {
    const t = translate();
    expect(foodSavingLabel(t, { mode: 'PERCENT', pct: 15 }, rupees, 'owner')).toBe('venueFoodOwner.menu.savingPercent:{"pct":15}');
    expect(foodSavingLabel(t, { mode: 'AMOUNT', amount: 5 }, rupees, 'owner')).toBe('venueFoodOwner.menu.savingAmount:{"amount":"₹5"}');
  });
});

describe('FOOD_CURRENCY_QUERY', () => {
  it('reads Finance currency symbol and nothing else', () => {
    expect(FOOD_CURRENCY_QUERY).toContain('query FoodMenuCurrency');
    expect(FOOD_CURRENCY_QUERY.replace(/\s+/g, ' ')).toContain('publicFinanceSettings { currency_symbol }');
  });
});
