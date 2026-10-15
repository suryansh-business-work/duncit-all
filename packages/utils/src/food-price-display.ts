/**
 * A dish's struck-through MRP and the saving beside it — ONE decision for the
 * public menu (mWeb + native) and the owner's menu editor preview (Partners,
 * Venues console, mWeb studio, native desk) — rules 27/40.
 *
 * DISPLAY ONLY. The guest is always charged the dish's `price`; the original
 * price never enters an order, a cart total or an invoice.
 */

/** How the saving reads: "20% off" or "₹40 off". Mirrors the server enum VenueFoodSavingDisplay. */
export type FoodSavingDisplay = 'PERCENT' | 'AMOUNT';

export const FOOD_SAVING_DISPLAYS = ['PERCENT', 'AMOUNT'] as const satisfies readonly FoodSavingDisplay[];

/** The dish fields the decision reads — a stored dish or a form row (prices may still be typed text). */
export interface FoodPriceSource {
  price: number | string;
  original_price?: number | string | null;
  saving_display?: string | null;
}

export type FoodSaving = { mode: 'PERCENT'; pct: number } | { mode: 'AMOUNT'; amount: number };

export interface FoodPriceDisplay {
  /** What the guest pays — always the dish's own price. */
  price: number;
  /** The MRP to strike through, or null when there is nothing to strike. */
  originalPrice: number | null;
  saving: FoodSaving | null;
}

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'string' ? Number(value.trim() || Number.NaN) : Number(value ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const roundPaise = (rupees: number): number => Math.round(rupees * 100) / 100;

/**
 * What to show for a dish's price. Struck through only when the original is a
 * real number above the price. A percent is rounded DOWN, so the label never
 * promises more than the guest saves; one that rounds to 0% reads as the amount.
 */
export function foodPriceDisplay(dish: FoodPriceSource): FoodPriceDisplay {
  const price = toNumber(dish.price);
  const original = toNumber(dish.original_price);
  if (!Number.isFinite(price) || !Number.isFinite(original) || original <= price || price <= 0) {
    return { price: Number.isFinite(price) ? price : 0, originalPrice: null, saving: null };
  }
  const amount = roundPaise(original - price);
  const pct = Math.floor((amount / original) * 100);
  const saving: FoodSaving =
    dish.saving_display === 'AMOUNT' || pct < 1 ? { mode: 'AMOUNT', amount } : { mode: 'PERCENT', pct };
  return { price, originalPrice: original, saving };
}

/** The translator shape the label takes — every surface's `t`. */
type SavingTranslate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** Who reads the label: a guest on the public menu, or the owner previewing their editor. */
export type FoodSavingAudience = 'guest' | 'owner';

// Literal keys (the translation gate greps for them): the guest's live in the
// mWeb bundle mWeb and native both ship; the owner's in venueFoodOwner, which
// every owner surface ships.
const SAVING_KEYS: Record<FoodSavingAudience, Record<FoodSaving['mode'], string>> = {
  guest: { PERCENT: 'mweb.venueFood.savingPercent', AMOUNT: 'mweb.venueFood.savingAmount' },
  owner: { PERCENT: 'venueFoodOwner.menu.savingPercent', AMOUNT: 'venueFoodOwner.menu.savingAmount' },
};

/** "20% off" / "₹40 off", or '' when there is no saving. `money` formats an amount in the surface's currency. */
export function foodSavingLabel(
  t: SavingTranslate,
  saving: FoodSaving | null,
  money: (amount: number) => string,
  audience: FoodSavingAudience = 'guest',
): string {
  if (!saving) return '';
  const keys = SAVING_KEYS[audience];
  return saving.mode === 'PERCENT'
    ? t(keys.PERCENT, { vars: { pct: saving.pct } })
    : t(keys.AMOUNT, { vars: { amount: money(saving.amount) } });
}

/**
 * The currency an owner's price preview is shown in — Finance's symbol, the
 * one the guest's menu prints (never hardcoded on a surface).
 */
export const FOOD_CURRENCY_QUERY = /* GraphQL */ `
  query FoodMenuCurrency {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;
