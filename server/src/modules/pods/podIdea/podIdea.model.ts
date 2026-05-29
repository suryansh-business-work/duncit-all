import { Schema, model, Types, type Document } from 'mongoose';

export interface IPodIdeaComment {
  _id?: Types.ObjectId;
  author_id: Types.ObjectId;
  text: string;
  created_at: Date;
}

export interface IPodIdea extends Document {
  author_id: Types.ObjectId;
  title: string;
  description: string;
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
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2001 },
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
