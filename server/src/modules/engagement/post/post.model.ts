import { Schema, model, Types, type Document } from 'mongoose';

export type PostMediaType = 'IMAGE' | 'VIDEO';
export type PostKind = 'STORY' | 'POST';

export interface IPostComment {
  _id?: Types.ObjectId;
  author_id: Types.ObjectId;
  text: string;
  created_at: Date;
}

/** A record of one viewer opening a STORY — powers seen/unseen rings (Bug 2)
 * and the owner's "who viewed" list (Bug 4). */
export interface IStoryView {
  user_id: Types.ObjectId;
  viewed_at: Date;
}

export interface IPost extends Document {
  author_id: Types.ObjectId;
  /** Optional club a STORY is attached to — powers club-scoped stories (Bug 6). */
  club_id: Types.ObjectId | null;
  image_url: string;
  media_type: PostMediaType;
  kind: PostKind;
  caption: string;
  likes: Types.ObjectId[];
  comments: IPostComment[];
  /** Who has opened this story (deduped). Empty for permanent posts. */
  views: IStoryView[];
  expires_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const commentSchema = new Schema<IPostComment>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const storyViewSchema = new Schema<IStoryView>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    viewed_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const postSchema = new Schema<IPost>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', default: null, index: true },
    image_url: { type: String, required: true },
    // The media a story/post points at. Legacy docs are images.
    media_type: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
    // STORY = ephemeral (24h, never shown on the profile grid); POST = permanent
    // profile post. Legacy docs default to POST so existing grids are unchanged.
    kind: { type: String, enum: ['STORY', 'POST'], default: 'POST', index: true },
    caption: { type: String, default: '', trim: true, maxlength: 2200 },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: { type: [commentSchema], default: [] },
    // Deduped viewers of a STORY (Bugs 2 & 4). Purged with the story by the TTL.
    views: { type: [storyViewSchema], default: [] },
    // Set only for stories (created_at + 24h). Mongo TTL auto-purges expired
    // stories; permanent posts have no expires_at and are never touched.
    expires_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

postSchema.index({ author_id: 1, created_at: -1 });
// TTL: a document is removed once expires_at passes. Docs without expires_at
// (permanent posts) are ignored by the TTL monitor.
postSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const PostModel = model<IPost>('Post', postSchema);
