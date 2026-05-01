import { Schema, model, Types, type Document } from 'mongoose';

export interface IFaq extends Document {
  super_category_id: Types.ObjectId | null;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    super_category_id: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    is_active: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

faqSchema.index({ super_category_id: 1, sort_order: 1 });

export const FaqModel = model<IFaq>('Faq', faqSchema);
