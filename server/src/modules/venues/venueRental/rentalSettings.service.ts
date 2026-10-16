import { GraphQLError } from 'graphql';
import { RENTAL_SETTINGS_DEFAULTS, RentalSettingsModel, type IRentalSettings } from './rentalSettings.model';

export type RentalSettings = Omit<IRentalSettings, 'singleton_key' | 'created_at' | 'updated_at'> & {
  updated_at: string | null;
};

export interface RentalSettingsInput {
  enabled?: boolean | null;
  terms_html?: string | null;
  commission_pct?: number | null;
  rent_refundable_on_backout?: boolean | null;
  deposit_refundable?: boolean | null;
  booking_cutoff_hours?: number | null;
  deposit_auto_release_days?: number | null;
}

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const wholeIn = (raw: number, min: number, max: number, label: string) => {
  if (!Number.isInteger(raw) || raw < min || raw > max) bad(`${label} must be a whole number from ${min} to ${max}`);
  return raw;
};

const toPub = (doc: Partial<IRentalSettings> | null): RentalSettings => ({
  enabled: doc?.enabled ?? RENTAL_SETTINGS_DEFAULTS.enabled,
  terms_html: doc?.terms_html ?? RENTAL_SETTINGS_DEFAULTS.terms_html,
  commission_pct: doc?.commission_pct ?? RENTAL_SETTINGS_DEFAULTS.commission_pct,
  rent_refundable_on_backout: doc?.rent_refundable_on_backout ?? RENTAL_SETTINGS_DEFAULTS.rent_refundable_on_backout,
  deposit_refundable: doc?.deposit_refundable ?? RENTAL_SETTINGS_DEFAULTS.deposit_refundable,
  booking_cutoff_hours: doc?.booking_cutoff_hours ?? RENTAL_SETTINGS_DEFAULTS.booking_cutoff_hours,
  deposit_auto_release_days: doc?.deposit_auto_release_days ?? RENTAL_SETTINGS_DEFAULTS.deposit_auto_release_days,
  updated_at: doc?.updated_at ? new Date(doc.updated_at).toISOString() : null,
});

/** Only the fields the caller sent, each checked. */
function patchOf(input: RentalSettingsInput): Partial<IRentalSettings> {
  const patch: Partial<IRentalSettings> = {};
  if (typeof input.enabled === 'boolean') patch.enabled = input.enabled;
  if (typeof input.terms_html === 'string') {
    if (input.terms_html.length > 50_000) bad('Keep the rental terms under 50,000 characters');
    patch.terms_html = input.terms_html;
  }
  if (typeof input.commission_pct === 'number') {
    if (!Number.isFinite(input.commission_pct) || input.commission_pct < 0 || input.commission_pct > 100) {
      bad('The rental commission must be between 0 and 100');
    }
    patch.commission_pct = Math.round(input.commission_pct * 100) / 100;
  }
  if (typeof input.rent_refundable_on_backout === 'boolean') {
    patch.rent_refundable_on_backout = input.rent_refundable_on_backout;
  }
  if (typeof input.deposit_refundable === 'boolean') patch.deposit_refundable = input.deposit_refundable;
  if (typeof input.booking_cutoff_hours === 'number') {
    patch.booking_cutoff_hours = wholeIn(input.booking_cutoff_hours, 0, 168, 'The booking cut-off');
  }
  if (typeof input.deposit_auto_release_days === 'number') {
    patch.deposit_auto_release_days = wholeIn(input.deposit_auto_release_days, 1, 60, 'The deposit auto-release');
  }
  return patch;
}

export const rentalSettingsService = {
  async get(): Promise<RentalSettings> {
    return toPub(await RentalSettingsModel.findOne({ singleton_key: 'rentals' }).lean());
  },

  async update(input: RentalSettingsInput): Promise<RentalSettings> {
    const doc = await RentalSettingsModel.findOneAndUpdate(
      { singleton_key: 'rentals' },
      { $set: patchOf(input), $setOnInsert: { singleton_key: 'rentals' } },
      { upsert: true, new: true }
    ).lean();
    return toPub(doc);
  },
};
