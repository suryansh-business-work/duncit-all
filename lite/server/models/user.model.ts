import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const DISPLAY_MODES = ['SYSTEM', 'LIGHT', 'DARK'] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

/** The profile links a person can show, each stored as the handle or the full site URL. */
export const SOCIAL_KEYS = ['instagram', 'x', 'youtube', 'tiktok', 'linkedin', 'website'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

const socialSchema = new Schema(Object.fromEntries(SOCIAL_KEYS.map((key) => [key, { type: String, default: '' }])), { _id: false });

/** Unique only among accounts that HAVE the value: a phone-only account has no email, and most have no phone. */
const presentString = { $type: 'string' } as const;

/**
 * A Lite account. Deliberately small — a way to reach the person (an email, a
 * phone, or both), a name and a handle are all an event needs.
 * `duncit_user_id` is set when the account signed in through a Duncit account
 * (proved against the main API, never read from its database).
 */
const userSchema = new Schema(
  {
    /** Absent (not '') on a phone-only account, so the partial unique index ignores it. */
    email: { type: String, lowercase: true, trim: true, default: undefined },
    /** E.164, e.g. +919876543210; absent until a phone is proved by an SMS code. */
    phone: { type: String, trim: true, default: undefined },
    name: { type: String, required: true, trim: true },
    handle: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar_url: { type: String, default: '' },
    bio: { type: String, default: '' },
    social: { type: socialSchema, default: () => ({}) },
    upi_id: { type: String, default: '' },
    upi_name: { type: String, default: '' },
    locale: { type: String, default: '' },
    display_mode: { type: String, enum: DISPLAY_MODES, default: 'SYSTEM' },
    is_admin: { type: Boolean, default: false, index: true },
    is_blocked: { type: Boolean, default: false, index: true },
    duncit_user_id: { type: String, default: '' },
    google_sub: { type: String, default: '' },
    last_sign_in_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

userSchema.index({ email: 1 }, { name: 'email_present_unique', unique: true, partialFilterExpression: { email: presentString } });
userSchema.index({ phone: 1 }, { name: 'phone_present_unique', unique: true, partialFilterExpression: { phone: presentString } });

export type LiteUser = InferSchemaType<typeof userSchema>;
export type LiteUserDoc = HydratedDocument<LiteUser>;
export const LiteUserModel = model('LiteUser', userSchema, 'lite_users');

/**
 * The first deploys indexed `email` as plain unique, which would refuse a
 * second phone-only account (two missing emails index as two nulls). Drop that
 * index once, then build the partial ones. Safe to run on every boot.
 */
export async function migrateUserIndexes(): Promise<void> {
  const existing = await LiteUserModel.collection.indexes().catch(() => []);
  if (existing.some((index) => index.name === 'email_1')) await LiteUserModel.collection.dropIndex('email_1');
  await LiteUserModel.createIndexes();
}
