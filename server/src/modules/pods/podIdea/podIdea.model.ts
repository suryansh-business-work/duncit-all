import { Schema, model, Types, type Document } from 'mongoose';

export interface IPodIdeaComment {
  _id?: Types.ObjectId;
  author_id: Types.ObjectId;
  text: string;
  created_at: Date;
}

export interface IPodIdea extends Document {
  author_id: Types.ObjectId;
  /** Human-readable permanent id shown in the table (e.g. DUN-000001). */
  idea_no: string;
  title: string;
  description: string;
  /** Mandatory Super/Category/Sub the idea maps to (ids + denormalized names). */
  super_category_id: Types.ObjectId | null;
  category_id: Types.ObjectId | null;
  sub_category_id: Types.ObjectId | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  likes: Types.ObjectId[];
  shares_count: number;
  comments: IPodIdeaComment[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: Date;
  updated_at: Date;
}

const commentSchema = new Schema<IPodIdeaComment>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const podIdeaSchema = new Schema<IPodIdea>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    idea_no: { type: String, default: '', index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2001 },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    super_category_name: { type: String, default: '' },
    category_name: { type: String, default: '' },
    sub_category_name: { type: String, default: '' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    shares_count: { type: Number, default: 0 },
    comments: { type: [commentSchema], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podIdeaSchema.index({ created_at: -1 });

export const PodIdeaModel = model<IPodIdea>('PodIdea', podIdeaSchema);
