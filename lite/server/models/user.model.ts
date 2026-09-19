import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * A Lite account. Deliberately small — an email, a name and a handle are all
 * an event needs. `duncit_user_id` is set when the account signed in through
 * a Duncit account (proved against the main API, never read from its database).
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    handle: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar_url: { type: String, default: '' },
    bio: { type: String, default: '' },
    upi_id: { type: String, default: '' },
    upi_name: { type: String, default: '' },
    locale: { type: String, default: '' },
    is_admin: { type: Boolean, default: false, index: true },
    is_blocked: { type: Boolean, default: false, index: true },
    duncit_user_id: { type: String, default: '' },
    google_sub: { type: String, default: '' },
    last_sign_in_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteUser = InferSchemaType<typeof userSchema>;
export type LiteUserDoc = HydratedDocument<LiteUser>;
export const LiteUserModel = model('LiteUser', userSchema, 'lite_users');
