import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  SOCIAL_IDEA_FORMATS,
  SOCIAL_IDEA_STATUSES,
  SOCIAL_MEDIA_TYPES,
  SOCIAL_PLATFORMS,
  SOCIAL_PUBLISH_STATUSES,
  SOCIAL_TARGET_STATUSES,
} from './social.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

/** One network a post goes to; each is published — and fails — on its own. */
const targetSchema = new Schema(
  {
    account_id: { type: String, required: true },
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    status: { type: String, enum: SOCIAL_TARGET_STATUSES, default: 'PENDING' },
    external_id: { type: String, default: '' },
    permalink: { type: String, default: '' },
    error: { type: String, default: '' },
    published_at: { type: Date, default: null },
  },
  { _id: false }
);

/**
 * A post written in Duncit — Buffer's queue item. One text and one piece of
 * media go to every target; the post's status is the sum of its targets'.
 */
const scheduledPostSchema = new Schema(
  {
    text: { type: String, default: '' },
    media_url: { type: String, default: '' },
    media_type: { type: String, enum: [...SOCIAL_MEDIA_TYPES, null], default: null },
    status: { type: String, enum: SOCIAL_PUBLISH_STATUSES, default: 'DRAFT', index: true },
    /** When it goes out. Null for a draft with no date yet. */
    scheduled_at: { type: Date, default: null, index: true },
    published_at: { type: Date, default: null },
    targets: { type: [targetSchema], default: [] },
    /** The AI idea this post was written from, if any. */
    idea_id: { type: String, default: '' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps }
);
// The publisher's claim query: the oldest due post still waiting.
scheduledPostSchema.index({ status: 1, scheduled_at: 1 });

/** An AI-suggested post, kept so the team can pick it up later — Buffer's Ideas board. */
const ideaSchema = new Schema(
  {
    title: { type: String, required: true },
    caption: { type: String, default: '' },
    hashtags: { type: [String], default: [] },
    platforms: { type: [String], enum: SOCIAL_PLATFORMS, default: [] },
    format: { type: String, enum: SOCIAL_IDEA_FORMATS, default: 'TEXT' },
    why: { type: String, default: '' },
    /** What the marketer asked for — shown with the idea so its context survives. */
    brief: { type: String, default: '' },
    status: { type: String, enum: SOCIAL_IDEA_STATUSES, default: 'NEW', index: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps }
);

export type SocialScheduledPostDoc = InferSchemaType<typeof scheduledPostSchema> & { _id: any };
export type SocialIdeaDoc = InferSchemaType<typeof ideaSchema> & { _id: any };

export const SocialScheduledPostModel = model('SocialScheduledPost', scheduledPostSchema);
export const SocialIdeaModel = model('SocialIdea', ideaSchema);
