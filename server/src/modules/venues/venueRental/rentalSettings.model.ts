import { Schema, model } from 'mongoose';

/**
 * Finance > Rented Items > Settings — the platform rules every venue rental
 * runs under. One document (`singleton_key: 'rentals'`).
 */
export interface IRentalSettings {
  singleton_key: 'rentals';
  /** Master switch: off hides Pod Rent everywhere and refuses new rentals. */
  enabled: boolean;
  /** Terms & Conditions every renter agrees to, as rich-text HTML (Finance-authored). */
  terms_html: string;
  /** Duncit's commission on rental money (rent only, never the deposit), percent. */
  commission_pct: number;
  /** Whether a guest who backs out of the pod in time gets the rent back. A
   * cancelled pod always refunds it — the guest could not have used the item. */
  rent_refundable_on_backout: boolean;
  /** Whether deposits are refunded once the venue marks the item returned. Off
   * = the deposit is a fee the venue keeps (shown to guests as non-refundable). */
  deposit_refundable: boolean;
  /** Renting for a pod closes this many hours before it starts. */
  booking_cutoff_hours: number;
  /** A deposit the venue has not marked (returned or damaged) this many days
   * after the pod ends is refunded automatically. */
  deposit_auto_release_days: number;
  updated_at: Date;
  created_at: Date;
}

export const RENTAL_SETTINGS_DEFAULTS = {
  enabled: true,
  terms_html: '',
  commission_pct: 10,
  rent_refundable_on_backout: true,
  deposit_refundable: true,
  booking_cutoff_hours: 2,
  deposit_auto_release_days: 3,
} as const;

const rentalSettingsSchema = new Schema<IRentalSettings>(
  {
    singleton_key: { type: String, default: 'rentals', unique: true },
    enabled: { type: Boolean, default: RENTAL_SETTINGS_DEFAULTS.enabled },
    terms_html: { type: String, default: RENTAL_SETTINGS_DEFAULTS.terms_html, maxlength: 50_000 },
    commission_pct: { type: Number, default: RENTAL_SETTINGS_DEFAULTS.commission_pct, min: 0, max: 100 },
    rent_refundable_on_backout: { type: Boolean, default: RENTAL_SETTINGS_DEFAULTS.rent_refundable_on_backout },
    deposit_refundable: { type: Boolean, default: RENTAL_SETTINGS_DEFAULTS.deposit_refundable },
    booking_cutoff_hours: { type: Number, default: RENTAL_SETTINGS_DEFAULTS.booking_cutoff_hours, min: 0, max: 168 },
    deposit_auto_release_days: {
      type: Number,
      default: RENTAL_SETTINGS_DEFAULTS.deposit_auto_release_days,
      min: 1,
      max: 60,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const RentalSettingsModel = model<IRentalSettings>('RentalSettings', rentalSettingsSchema);
