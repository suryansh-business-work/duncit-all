import { GiftCardSettingsModel, type IGiftCardSettings } from './giftcard.model';

/**
 * The gift card sales policy: what amounts are offered and how long a card
 * lives. Kept in its own singleton (not AppSettings) for the same reason the
 * coin rates are — this is money policy owned by Finance, whose role cannot
 * write AppSettings.
 */

const SINGLETON = { singleton_key: 'giftcard' };

/** A whole-rupee amount. `value || fallback` would turn a legal 0 back into the
 * default — but here every field has a floor of 1, so only NaN falls back. */
const cleanAmount = (value: unknown, fallback: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
};

const settingsPub = (doc: IGiftCardSettings) => ({
  denominations: [...(doc.denominations ?? [])],
  min_amount: doc.min_amount,
  max_amount: doc.max_amount,
  validity_months: doc.validity_months,
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

export const giftCardSettingsService = {
  /** The singleton, created with schema defaults the first time it is asked for. */
  async get(): Promise<IGiftCardSettings> {
    const doc = await GiftCardSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: SINGLETON },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc!;
  },

  async pub() {
    return settingsPub(await this.get());
  },

  async update(input: {
    denominations?: number[] | null;
    min_amount?: number | null;
    max_amount?: number | null;
    validity_months?: number | null;
  }) {
    const doc = await this.get();
    if (Array.isArray(input.denominations)) {
      const cleaned = [
        ...new Set(input.denominations.map((d) => cleanAmount(d, 0)).filter((d) => d >= 1)),
      ].sort((a, b) => a - b);
      if (cleaned.length > 0) doc.denominations = cleaned;
    }
    if (input.min_amount != null) doc.min_amount = cleanAmount(input.min_amount, doc.min_amount);
    if (input.max_amount != null) doc.max_amount = cleanAmount(input.max_amount, doc.max_amount);
    if (input.validity_months != null) {
      const months = cleanAmount(input.validity_months, doc.validity_months);
      doc.validity_months = Math.min(60, months);
    }
    if (doc.max_amount < doc.min_amount) doc.max_amount = doc.min_amount;
    await doc.save();
    return settingsPub(doc);
  },

  /** Boot seed — creates the singleton so the buy page has amounts on day one. */
  async seed(): Promise<void> {
    await this.get();
  },
};
