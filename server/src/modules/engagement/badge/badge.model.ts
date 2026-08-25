import { Schema, model, Types, type Document } from 'mongoose';

/**
 * How a badge is earned. Everything except MANUAL is re-derived from the
 * member's own activity on every read, so a badge is never a stale row.
 *
 * The four *_COUNT conditions that predate the catalogue count MEMBERSHIPS;
 * the attendance-based ones added with the Badges section count TICKETS the
 * host actually marked present, because that — not the booking — is what the
 * platform treats as having shown up (rule 41).
 */
export const BADGE_CONDITION_TYPES = [
  'POD_JOIN_COUNT',
  'POD_HOST_COUNT',
  'CLUB_JOIN_COUNT',
  'POD_REFERRAL_COUNT',
  'POD_ATTEND_COUNT',
  'CATEGORY_POD_ATTEND_COUNT',
  'PLUS_ONE_POD_COUNT',
  'DISTINCT_CATEGORY_COUNT',
  'MONTHLY_POD_ATTEND_COUNT',
  'ROLE_GRANTED',
  'MANUAL',
] as const;

export type BadgeConditionType = (typeof BADGE_CONDITION_TYPES)[number];

export interface IBadge extends Document {
  badge_id: string;
  title: string;
  description: string;
  image_url: string;
  condition_type: BadgeConditionType;
  threshold: number;
  /** CATEGORY_POD_ATTEND_COUNT only: the category the pods must belong to. */
  category_id: Types.ObjectId | null;
  /** ROLE_GRANTED only: the role key that unlocks the badge. */
  role_key: string;
  /** Display order in the members' Badges section (ascending). */
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const badgeSchema = new Schema<IBadge>(
  {
    badge_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image_url: { type: String, default: '' },
    condition_type: {
      type: String,
      enum: BADGE_CONDITION_TYPES,
      default: 'POD_JOIN_COUNT',
    },
    threshold: { type: Number, default: 1, min: 1 },
    // Null on every badge whose condition is not category-scoped, and on a
    // category badge whose category an admin has not picked yet — which simply
    // means nobody qualifies, never that everybody does.
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    role_key: { type: String, default: '', trim: true, uppercase: true },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

badgeSchema.index({ sort_order: 1, created_at: 1 });

export const BadgeModel = model<IBadge>('Badge', badgeSchema);

/**
 * The moment a member first met a badge's condition.
 *
 * Eligibility itself is recomputed live, so this row is NOT the source of
 * truth for "do they have it" — it is the source of truth for WHEN, which a
 * live recount can never recover. "Achieved on 14 Mar" has to keep saying 14
 * Mar on every later visit.
 */
export interface IUserBadge extends Document {
  user_id: Types.ObjectId;
  badge_id: Types.ObjectId;
  awarded_at: Date;
  awarded_reason: string;
}

const userBadgeSchema = new Schema<IUserBadge>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    badge_id: { type: Schema.Types.ObjectId, ref: 'Badge', required: true, index: true },
    awarded_at: { type: Date, default: () => new Date() },
    awarded_reason: { type: String, default: '' },
  },
  { timestamps: false }
);

userBadgeSchema.index({ user_id: 1, badge_id: 1 }, { unique: true });

export const UserBadgeModel = model<IUserBadge>('UserBadge', userBadgeSchema);
