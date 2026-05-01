import { Schema, model, Types, type Document } from 'mongoose';

export type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

export interface ICategoryMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  media: ICategoryMedia[];
  level: CategoryLevel;
  parent_id: Types.ObjectId | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const mediaSchema = new Schema<ICategoryMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
  },
  { _id: false }
);

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    icon: { type: String, default: '' },
    description: { type: String, default: '' },
    media: { type: [mediaSchema], default: [] },
    level: { type: String, enum: ['SUPER', 'CATEGORY', 'SUB'], required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    is_active: { type: Boolean, default: true },
    is_system: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

categorySchema.index({ parent_id: 1, slug: 1 }, { unique: true });
categorySchema.index({ level: 1, parent_id: 1 });

export const CategoryModel = model<ICategory>('Category', categorySchema);
