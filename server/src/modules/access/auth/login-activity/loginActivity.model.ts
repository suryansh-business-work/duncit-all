import { Schema, model, InferSchemaType } from 'mongoose';

/** How long a sign-in stays in a member's Login activity. Comfortably over the
 * month a person looks back on; the TTL index below removes older rows. */
export const LOGIN_ACTIVITY_RETENTION_DAYS = 90;

/**
 * One successful sign-in, as the member sees it under Profile > Login activity:
 * when, how, from where (an offline geo-IP guess) and on what. Written once per
 * sign-in and never edited. `user_id` is a `ref: 'User'`, so account deletion
 * finds and purges these rows with the rest of the member's data.
 */
const loginActivitySchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    signed_in_at: { type: Date, required: true, default: () => new Date() },
    /** EMAIL, OTP, GOOGLE or APPLE — the account's `auth.last_login_provider`. */
    provider: { type: String, default: null },
    ip: { type: String, default: null },
    city: { type: String, default: null },
    region: { type: String, default: null },
    country: { type: String, default: null },
    browser: { type: String, default: null },
    os: { type: String, default: null },
    device_type: { type: String, default: null },
    /** The declared client (`x-duncit-surface`): NATIVE, MWEB, PORTAL… */
    surface: { type: String, default: null },
    /** The host the sign-in came from, e.g. `admin.duncit.com`. */
    origin_host: { type: String, default: null },
  },
  { versionKey: false }
);

// "My sign-ins, newest first" is the only read.
loginActivitySchema.index({ user_id: 1, signed_in_at: -1 });
loginActivitySchema.index(
  { signed_in_at: 1 },
  { expireAfterSeconds: LOGIN_ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 }
);

export type LoginActivityDoc = InferSchemaType<typeof loginActivitySchema>;
export const LoginActivityModel = model('LoginActivity', loginActivitySchema);
