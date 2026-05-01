import { Schema, model, Types, type Document } from 'mongoose';

export interface IPostComment {
  _id?: Types.ObjectId;
  author_id: Types.ObjectId;
  text: string;
  created_at: Date;
}

export interface IPost extends Document {
  author_id: Types.ObjectId;
  image_url: string;
  caption: string;
  likes: Types.ObjectId[];
  comments: IPostComment[];
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

const postSchema = new Schema<IPost>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    image_url: { type: String, required: true },
    caption: { type: String, default: '', trim: true, maxlength: 2200 },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

postSchema.index({ author_id: 1, created_at: -1 });

export const PostModel = model<IPost>('Post', postSchema);
