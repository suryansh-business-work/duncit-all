import { Schema, model, Types, type Document } from 'mongoose';

/**
 * Short how-to videos the Support portal publishes and members watch from the
 * app's menu (Tutorials). The three counters are denormalised for the feed and
 * the Support dashboard; each one moves ONLY when its engagement row (like,
 * comment, view) was really created or removed — see tutorialEngagement.service.
 */
export const TUTORIAL_LANGUAGES = ['en', 'hi'] as const;
export type TutorialLanguage = (typeof TUTORIAL_LANGUAGES)[number];

export const TUTORIAL_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type TutorialStatus = (typeof TUTORIAL_STATUSES)[number];

export interface ITutorial extends Document {
  title: string;
  description: string;
  /** A TutorialTopic `key`. */
  topic: string;
  language: TutorialLanguage;
  video_url: string;
  thumbnail_url: string;
  duration_sec: number;
  status: TutorialStatus;
  sort_order: number;
  created_by: Types.ObjectId | null;
  like_count: number;
  comment_count: number;
  /** Unique viewers — one per (tutorial, member) TutorialView row. */
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

const tutorialSchema = new Schema<ITutorial>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    topic: { type: String, required: true, trim: true, index: true },
    language: { type: String, enum: TUTORIAL_LANGUAGES, required: true },
    video_url: { type: String, required: true, trim: true },
    thumbnail_url: { type: String, default: '', trim: true },
    duration_sec: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: TUTORIAL_STATUSES, default: 'DRAFT' },
    sort_order: { type: Number, default: 0 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    like_count: { type: Number, default: 0, min: 0 },
    comment_count: { type: Number, default: 0, min: 0 },
    view_count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The member feed: published, narrowed by language and topic, in curated order.
tutorialSchema.index({ status: 1, language: 1, topic: 1, sort_order: 1, created_at: -1 });

export const TutorialModel = model<ITutorial>('Tutorial', tutorialSchema);

export interface ITutorialTopic extends Document {
  /** Stable slug stored on each tutorial — never shown to members. */
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const tutorialTopicSchema = new Schema<ITutorialTopic>(
  {
    key: { type: String, required: true, trim: true, lowercase: true, unique: true },
    label: { type: String, required: true, trim: true },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TutorialTopicModel = model<ITutorialTopic>('TutorialTopic', tutorialTopicSchema);
