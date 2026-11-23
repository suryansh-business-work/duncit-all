import { GraphQLError } from 'graphql';
import { GiftCardSettingsModel, type IGiftCardSettings } from './giftcard.model';

/**
 * The gift card sales policy: what amounts are offered, how many cards one
 * order may hold, how long a card lives, and how printed cards are delivered.
 * Kept in its own singleton (not AppSettings) for the same reason the coin
 * rates are — this is money policy owned by Loyalty/Finance, whose roles cannot
 * write AppSettings.
 */

const SINGLETON = { singleton_key: 'giftcard' };

/** Hard ceiling on one order's quantity, whatever the policy says. */
export const MAX_ORDER_QUANTITY = 50;

const badInput = (message: string, field: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', field } });
};

/** A whole-rupee amount. `value || fallback` would turn a legal 0 back into the
 * default — but here every field has a floor of 1, so only NaN falls back. */
const cleanAmount = (value: unknown, fallback: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
};

/** A positive measurement (kg / cm) within its bounds, or the current value. */
const cleanMeasure = (value: unknown, current: number, min: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return current;
  return Math.round(n * 1000) / 1000;
};

/** What every member-facing surface may read. */
const settingsPub = (doc: IGiftCardSettings) => ({
  denominations: [...(doc.denominations ?? [])].filter(
    (d) => d >= doc.min_amount && d <= doc.max_amount
  ),
  min_amount: doc.min_amount,
  max_amount: doc.max_amount,
  validity_months: doc.validity_months,
  max_quantity: doc.max_quantity ?? 10,
  physical_enabled: !!doc.physical_enabled,
  shipping_fee: doc.shipping_fee ?? 0,
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

/** The courier side — Loyalty console only. */
const shippingPub = (doc: IGiftCardSettings) => ({
  pickup_location: doc.pickup_location ?? '',
  parcel_weight_kg: doc.parcel_weight_kg,
  parcel_length_cm: doc.parcel_length_cm,
  parcel_breadth_cm: doc.parcel_breadth_cm,
  parcel_height_cm: doc.parcel_height_cm,
});

export interface GiftCardSettingsUpdate {
  denominations?: number[] | null;
  min_amount?: number | null;
  max_amount?: number | null;
  validity_months?: number | null;
  max_quantity?: number | null;
  physical_enabled?: boolean | null;
  shipping_fee?: number | null;
  pickup_location?: string | null;
  parcel_weight_kg?: number | null;
  parcel_length_cm?: number | null;
  parcel_breadth_cm?: number | null;
  parcel_height_cm?: number | null;
}

function applyAmounts(doc: IGiftCardSettings, input: GiftCardSettingsUpdate) {
  if (Array.isArray(input.denominations)) {
    const cleaned = [
      ...new Set(input.denominations.map((d) => cleanAmount(d, 0)).filter((d) => d >= 1)),
    ].sort((a, b) => a - b);
    if (cleaned.length > 0) doc.denominations = cleaned;
  }
  if (input.min_amount != null) doc.min_amount = cleanAmount(input.min_amount, doc.min_amount);
  if (input.max_amount != null) doc.max_amount = cleanAmount(input.max_amount, doc.max_amount);
  // Refused, not quietly corrected: the console must show the person who typed
  // a minimum above the maximum what is wrong, instead of saving something else.
  if (doc.max_amount < doc.min_amount) {
    badInput('The maximum amount must be at least the minimum amount', 'max_amount');
  }
  if (input.validity_months != null) {
    const months = cleanAmount(input.validity_months, doc.validity_months);
    doc.validity_months = Math.min(60, months);
  }
  if (input.max_quantity != null) {
    doc.max_quantity = Math.min(MAX_ORDER_QUANTITY, cleanAmount(input.max_quantity, doc.max_quantity));
  }
}

function applyShipping(doc: IGiftCardSettings, input: GiftCardSettingsUpdate) {
  if (input.shipping_fee != null) {
    const fee = Number(input.shipping_fee);
    if (!Number.isFinite(fee) || fee < 0) badInput('Enter a valid delivery fee', 'shipping_fee');
    doc.shipping_fee = Math.round(fee * 100) / 100;
  }
  if (input.physical_enabled != null) doc.physical_enabled = input.physical_enabled;
  // Delivery is never free: a physical order always carries the courier fee.
  if (doc.physical_enabled && !(doc.shipping_fee > 0)) {
    badInput('Set a delivery fee before switching on physical gift cards', 'shipping_fee');
  }
  if (input.pickup_location != null) doc.pickup_location = input.pickup_location.trim();
  doc.parcel_weight_kg = cleanMeasure(input.parcel_weight_kg, doc.parcel_weight_kg, 0.05, 50);
  doc.parcel_length_cm = cleanMeasure(input.parcel_length_cm, doc.parcel_length_cm, 0.5, 300);
  doc.parcel_breadth_cm = cleanMeasure(input.parcel_breadth_cm, doc.parcel_breadth_cm, 0.5, 300);
  doc.parcel_height_cm = cleanMeasure(input.parcel_height_cm, doc.parcel_height_cm, 0.5, 120);
}

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

  async shipping() {
    return shippingPub(await this.get());
  },

  async update(input: GiftCardSettingsUpdate) {
    const doc = await this.get();
    applyAmounts(doc, input);
    applyShipping(doc, input);
    await doc.save();
    return settingsPub(doc);
  },

  /** Boot seed — creates the singleton so the buy page has amounts on day one. */
  async seed(): Promise<void> {
    await this.get();
  },
};
