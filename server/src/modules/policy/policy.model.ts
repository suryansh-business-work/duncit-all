import { Schema, model, type Document } from 'mongoose';

export interface IPolicy extends Document {
  slug: string;
  title: string;
  content: string; // HTML produced by the rich-text editor
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const policySchema = new Schema<IPolicy>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const PolicyModel = model<IPolicy>('Policy', policySchema);
