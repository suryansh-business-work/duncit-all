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
  /** SUB level only: may a host invite co-hosts to a pod in this sub-category? */
  allow_co_hosts: boolean;
  /** SUB level only: how many co-hosts a single pod may carry (1-5). Only
   * meaningful while allow_co_hosts is true. */
  max_co_hosts: number;
  created_at: Date;
  updated_at: Date;
}

/** Bounds for ICategory.max_co_hosts — shared with the schema + validators. */
export const MIN_CO_HOSTS = 1;
export const MAX_CO_HOSTS = 5;

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
    // Co-hosting is configured per SUB-category by an admin. Defaults keep every
    // existing sub-category behaving exactly as before (no co-hosts).
    allow_co_hosts: { type: Boolean, default: false },
    max_co_hosts: {
      type: Number,
      default: MIN_CO_HOSTS,
      min: MIN_CO_HOSTS,
      max: MAX_CO_HOSTS,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

categorySchema.index({ parent_id: 1, slug: 1 }, { unique: true });
categorySchema.index({ level: 1, parent_id: 1 });

export const CategoryModel = model<ICategory>('Category', categorySchema);
