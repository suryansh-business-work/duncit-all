import { Schema, model, Types, type Document } from 'mongoose';

export type BadgeConditionType =
  | 'POD_JOIN_COUNT'
  | 'POD_HOST_COUNT'
  | 'CLUB_JOIN_COUNT'
  | 'POD_REFERRAL_COUNT'
  | 'MANUAL';

export interface IBadge extends Document {
  badge_id: string;
  title: string;
  description: string;
  image_url: string;
  condition_type: BadgeConditionType;
  threshold: number;
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
      enum: ['POD_JOIN_COUNT', 'POD_HOST_COUNT', 'CLUB_JOIN_COUNT', 'POD_REFERRAL_COUNT', 'MANUAL'],
      default: 'POD_JOIN_COUNT',
    },
    threshold: { type: Number, default: 1, min: 1 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const BadgeModel = model<IBadge>('Badge', badgeSchema);

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
