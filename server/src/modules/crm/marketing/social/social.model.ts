import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  SOCIAL_ACCOUNT_STATUSES,
  SOCIAL_AI_STATUSES,
  SOCIAL_PLATFORMS,
  SOCIAL_PROVIDERS,
  SOCIAL_REVIEW_STATUSES,
  SOCIAL_SENTIMENTS,
  SOCIAL_SEVERITIES,
} from './social.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

/**
 * One connected account — a Page, a channel, a profile.
 *
 * Tokens are `select: false`: nothing reads them unless it asks by name, so a
 * list or a GraphQL projection can never carry one out of the server.
 */
const accountSchema = new Schema(
  {
    provider: { type: String, enum: SOCIAL_PROVIDERS, required: true },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    external_id: { type: String, required: true },
    name: { type: String, default: '' },
    handle: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    profile_url: { type: String, default: '' },
    followers: { type: Number, default: 0 },
    access_token: { type: String, default: '', select: false },
    refresh_token: { type: String, default: '', select: false },
    token_expires_at: { type: Date, default: null },
    scopes: { type: [String], default: [] },
    meta: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: SOCIAL_ACCOUNT_STATUSES, default: 'CONNECTED', index: true },
    last_error: { type: String, default: '' },
    last_synced_at: { type: Date, default: null, index: true },
    connected_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps }
);
// Reconnecting the same Page updates it rather than adding a second copy.
accountSchema.index({ platform: 1, external_id: 1 }, { unique: true });

/** A day's follower count per account — what the growth line is drawn from. */
const snapshotSchema = new Schema(
  {
    account_id: { type: String, required: true },
    day: { type: String, required: true },
    followers: { type: Number, required: true },
  },
  { timestamps }
);
snapshotSchema.index({ account_id: 1, day: 1 }, { unique: true });

/**
 * A post's latest numbers, overwritten on every sync. `account_id` is the
 * account's id as a string so the table engine's `eq` filter can match it.
 */
const postSchema = new Schema(
  {
    account_id: { type: String, required: true, index: true },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    external_id: { type: String, required: true },
    text: { type: String, default: '' },
    media_url: { type: String, default: '' },
    permalink: { type: String, default: '' },
    published_at: { type: Date, required: true, index: true },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: null },
    engagement: { type: Number, default: 0 },
    // The AI's read of the post, written only when a marketer asks for it; a
    // sync `$set`s the fetched fields and leaves this alone.
    ai_analysis: {
      type: new Schema(
        {
          score: { type: Number, default: 0 },
          summary: { type: String, default: '' },
          strengths: { type: [String], default: [] },
          improvements: { type: [String], default: [] },
          next_idea: { type: String, default: '' },
          analyzed_at: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { timestamps }
);
postSchema.index({ account_id: 1, external_id: 1 }, { unique: true });
// The analytics windows and the calendar read by publish time across accounts.
postSchema.index({ account_id: 1, published_at: -1 });

/**
 * A comment, with the AI's read of it and whether a marketer has dealt with it.
 * The AI fields are written once, when the comment is analysed — a later sync
 * updates the text and likes and leaves the verdict alone.
 */
const commentSchema = new Schema(
  {
    account_id: { type: String, required: true, index: true },
    post_id: { type: String, required: true, index: true },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    external_id: { type: String, required: true },
    author_name: { type: String, default: '' },
    author_handle: { type: String, default: '' },
    text: { type: String, default: '' },
    permalink: { type: String, default: '' },
    published_at: { type: Date, required: true, index: true },
    likes: { type: Number, default: 0 },
    ai_status: { type: String, enum: SOCIAL_AI_STATUSES, default: 'PENDING', index: true },
    ai_sentiment: { type: String, enum: [...SOCIAL_SENTIMENTS, null], default: null },
    ai_categories: { type: [String], default: [] },
    ai_severity: { type: String, enum: [...SOCIAL_SEVERITIES, null], default: null },
    ai_reason: { type: String, default: '' },
    ai_analyzed_at: { type: Date, default: null },
    review_status: { type: String, enum: SOCIAL_REVIEW_STATUSES, default: 'OPEN', index: true },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps }
);
commentSchema.index({ account_id: 1, external_id: 1 }, { unique: true });

export type SocialAccountDoc = InferSchemaType<typeof accountSchema> & { _id: any };
export type SocialPostDoc = InferSchemaType<typeof postSchema> & { _id: any };
export type SocialCommentDoc = InferSchemaType<typeof commentSchema> & { _id: any };

export const SocialAccountModel = model('SocialAccount', accountSchema);
export const SocialAccountSnapshotModel = model('SocialAccountSnapshot', snapshotSchema);
export const SocialPostModel = model('SocialPost', postSchema);
export const SocialCommentModel = model('SocialComment', commentSchema);
