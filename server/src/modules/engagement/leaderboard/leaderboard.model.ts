import { Schema, model, Types, type Document } from 'mongoose';

/** The five boards, in display order. */
export const LEADERBOARD_CATEGORIES = ['USER', 'HOST', 'CLUB_ADMIN', 'VENUE', 'BRAND'] as const;
export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number];

/** The event kinds that earn points — one per board. */
export const LEADERBOARD_SOURCE_TYPES = [
  'POD_JOIN',
  'POD_HOSTED',
  'CLUB_POD_COMPLETED',
  'VENUE_POD_COMPLETED',
  'PRODUCT_SALE',
] as const;
export type LeaderboardSourceType = (typeof LEADERBOARD_SOURCE_TYPES)[number];

export const LEADERBOARD_REWARD_PERIODS = ['MONTHLY', 'YEARLY'] as const;
export type LeaderboardRewardPeriod = (typeof LEADERBOARD_REWARD_PERIODS)[number];

/**
 * Leaderboard points are engagement standing, NOT money and NOT Duncit Coins —
 * they rank users against each other, so they live in their own insert-only
 * ledger. A ledger (rather than per-user counters) is what makes the This
 * Month / This Year / All Time boards and the month-end reward windows
 * possible: every board is an aggregation over `created_at`.
 */
export interface ILeaderboardPoint extends Document {
  /** Narrowed from Document's `unknown` so serialising the id is type-safe. */
  _id: Types.ObjectId;
  category: LeaderboardCategory;
  user_id: Types.ObjectId;
  points: number;
  source_type: LeaderboardSourceType;
  /** Business key of the event that earned the row — with category, user and
   * source_type it forms the idempotency key. */
  source_id: string;
  /** The pod the event happened on, when there is one, for the admin ledger. */
  pod_id: Types.ObjectId | null;
  created_at: Date;
}

const leaderboardPointSchema = new Schema<ILeaderboardPoint>(
  {
    category: { type: String, enum: LEADERBOARD_CATEGORIES, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    points: { type: Number, required: true, min: 0 },
    source_type: { type: String, enum: LEADERBOARD_SOURCE_TYPES, required: true },
    source_id: { type: String, required: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// A replayed webhook, a rejoin after a backout, or a double-submitted
// completion must never award the same event twice. As with the coin ledger, a
// read-then-write check would let two concurrent calls both pass — so the
// database decides: a duplicate insert raises E11000 and the service swallows
// it. All four fields are required, so no partial filter is needed.
leaderboardPointSchema.index(
  { category: 1, user_id: 1, source_type: 1, source_id: 1 },
  { unique: true }
);

// Every board is "this category, this window, grouped by user" — the category
// prefix pins the board and created_at bounds the window.
leaderboardPointSchema.index({ category: 1, created_at: -1 });

export const LeaderboardPointModel = model<ILeaderboardPoint>(
  'LeaderboardPoint',
  leaderboardPointSchema
);

/** A prize the admin promises for finishing a window inside a rank range. */
export interface ILeaderboardReward {
  category: LeaderboardCategory;
  period: LeaderboardRewardPeriod;
  rank_from: number;
  rank_to: number;
  title: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

/** Admin-tunable leaderboard economics (singleton) — how much each action is
 * worth, and what finishing well pays at month/year end. */
export interface ILeaderboardSettings extends Document {
  singleton_key: string;
  points_per_join: number;
  points_per_host: number;
  points_per_club_pod: number;
  points_per_venue_pod: number;
  points_per_product_sale: number;
  rewards: ILeaderboardReward[];
  updated_at: Date;
}

const rewardSchema = new Schema<ILeaderboardReward>(
  {
    category: { type: String, enum: LEADERBOARD_CATEGORIES, required: true },
    period: { type: String, enum: LEADERBOARD_REWARD_PERIODS, required: true },
    rank_from: { type: Number, required: true, min: 1 },
    rank_to: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    is_active: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  { _id: false }
);

// 0 is a legal value (it turns that action's reward off), so readers must not
// use the `|| DEFAULT` idiom on these.
const pointsField = { type: Number, default: 10, min: 0, max: 100000 };

const leaderboardSettingsSchema = new Schema<ILeaderboardSettings>(
  {
    singleton_key: { type: String, unique: true, default: 'leaderboard' },
    points_per_join: pointsField,
    points_per_host: pointsField,
    points_per_club_pod: pointsField,
    points_per_venue_pod: pointsField,
    points_per_product_sale: pointsField,
    rewards: { type: [rewardSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const LeaderboardSettingsModel = model<ILeaderboardSettings>(
  'LeaderboardSettings',
  leaderboardSettingsSchema
);

export async function getLeaderboardSettings(): Promise<ILeaderboardSettings> {
  const existing = await LeaderboardSettingsModel.findOne({ singleton_key: 'leaderboard' });
  if (existing) return existing;
  return LeaderboardSettingsModel.create({ singleton_key: 'leaderboard' });
}
