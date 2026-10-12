import { Schema, model, type Document } from 'mongoose';

/**
 * How many times one environment entry may be tested inside a window — one row.
 *
 * A test is a real sign-in (or send) at the vendor, and several vendors lock
 * the user after a handful of wrong ones: ShipRocket answers "too many failed
 * login attempts" and refuses even the right password for a while. The cap is
 * set per category from Tech → Environment Variables → Settings; a category
 * with no cap of its own is unlimited, exactly as every test behaved before.
 */
export interface IEnvAttemptSettings extends Document {
  key: string;
  /** How long a count lasts before it starts again from zero. */
  window_hours: number;
  /** category → max tests per window. Absent or 0 means unlimited. */
  limits: Record<string, number>;
  updated_at: Date;
}

export const ENV_ATTEMPT_SETTINGS_KEY = 'env_attempts';

export const DEFAULT_ATTEMPT_WINDOW_HOURS = 24;

const envAttemptSettingsSchema = new Schema<IEnvAttemptSettings>(
  {
    key: { type: String, required: true, unique: true },
    window_hours: { type: Number, default: DEFAULT_ATTEMPT_WINDOW_HOURS },
    limits: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

export const EnvAttemptSettingsModel = model<IEnvAttemptSettings>('EnvAttemptSettings', envAttemptSettingsSchema);
