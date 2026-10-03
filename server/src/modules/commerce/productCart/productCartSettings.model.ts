import { Schema, model, type Document } from 'mongoose';

/**
 * Products portal > Cart > Cart Settings — one document.
 *
 * Two reminders share it: the in-app nudge (mWeb + native) and the reminder
 * email. Kept out of AppSettings because the Products team owns it, and that
 * mutation is gated on SUPER_ADMIN + TECH_MANAGER.
 */
export interface IProductCartSettings extends Document {
  singleton_key: string;
  /** Show the bottom "your cart is calling" nudge at all. */
  nudge_enabled: boolean;
  /** Minutes after the app opens (and after each nudge) before the next one. */
  nudge_delay_minutes: number;
  /** Seconds a nudge stays up before it hides itself. */
  nudge_auto_hide_seconds: number;
  /** Send the reminder email at all. */
  email_enabled: boolean;
  /** Hours after the cart last changed before the first email. */
  email_first_delay_hours: number;
  /** Hours between one email and the next for the same cart. */
  email_repeat_hours: number;
  /** Most emails one unchanged cart can get. */
  email_max_count: number;
  updated_by: string;
  updated_at: Date;
}

/** Bounds every write is clamped to — the portal form validates the same. */
export const CART_SETTINGS_BOUNDS = {
  nudge_delay_minutes: { min: 1, max: 1440, fallback: 10 },
  nudge_auto_hide_seconds: { min: 3, max: 60, fallback: 8 },
  email_first_delay_hours: { min: 1, max: 720, fallback: 3 },
  email_repeat_hours: { min: 1, max: 720, fallback: 24 },
  email_max_count: { min: 1, max: 20, fallback: 3 },
} as const;

const B = CART_SETTINGS_BOUNDS;

const productCartSettingsSchema = new Schema<IProductCartSettings>(
  {
    singleton_key: { type: String, required: true, unique: true },
    nudge_enabled: { type: Boolean, default: true },
    nudge_delay_minutes: { type: Number, default: B.nudge_delay_minutes.fallback },
    nudge_auto_hide_seconds: { type: Number, default: B.nudge_auto_hide_seconds.fallback },
    email_enabled: { type: Boolean, default: true },
    email_first_delay_hours: { type: Number, default: B.email_first_delay_hours.fallback },
    email_repeat_hours: { type: Number, default: B.email_repeat_hours.fallback },
    email_max_count: { type: Number, default: B.email_max_count.fallback },
    updated_by: { type: String, default: '' },
  },
  {
    collection: 'productcartsettings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const ProductCartSettingsModel = model<IProductCartSettings>(
  'ProductCartSettings',
  productCartSettingsSchema
);
