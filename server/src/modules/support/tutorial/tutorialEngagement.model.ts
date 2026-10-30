import { Schema, model, Types, type Document } from 'mongoose';

/** One member's like on one tutorial — the unique pair is the toggle's lock. */
export interface ITutorialLike extends Document {
  tutorial_id: Types.ObjectId;
  user_id: Types.ObjectId;
  created_at: Date;
}

const tutorialLikeSchema = new Schema<ITutorialLike>(
  {
    tutorial_id: { type: Schema.Types.ObjectId, ref: 'Tutorial', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
tutorialLikeSchema.index({ tutorial_id: 1, user_id: 1 }, { unique: true });

export const TutorialLikeModel = model<ITutorialLike>('TutorialLike', tutorialLikeSchema);

/** A member's comment. Deleting one stamps `deleted_at`; the row stays. */
export interface ITutorialComment extends Document {
  tutorial_id: Types.ObjectId;
  user_id: Types.ObjectId;
  text: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const tutorialCommentSchema = new Schema<ITutorialComment>(
  {
    tutorial_id: { type: Schema.Types.ObjectId, ref: 'Tutorial', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
// The comment drawer: one tutorial's live comments, newest first.
tutorialCommentSchema.index({ tutorial_id: 1, deleted_at: 1, created_at: -1 });

export const TutorialCommentModel = model<ITutorialComment>('TutorialComment', tutorialCommentSchema);

/**
 * "Watched": written once per (tutorial, member) — marking it again is a no-op,
 * so the tutorial's `view_count` counts unique viewers.
 */
export interface ITutorialView extends Document {
  tutorial_id: Types.ObjectId;
  user_id: Types.ObjectId;
  watched_at: Date;
  completed: boolean;
}

const tutorialViewSchema = new Schema<ITutorialView>(
  {
    tutorial_id: { type: Schema.Types.ObjectId, ref: 'Tutorial', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    watched_at: { type: Date, required: true },
    completed: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
tutorialViewSchema.index({ tutorial_id: 1, user_id: 1 }, { unique: true });

export const TutorialViewModel = model<ITutorialView>('TutorialView', tutorialViewSchema);
