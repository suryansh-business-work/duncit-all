import { Schema, model, Types, type Document } from 'mongoose';

export type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

export type CategoryIconPosition = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

/** Per-surface (mWeb / native) placement + size of a CATEGORY icon in the home
 * "vibe" tabber. Position is the icon's placement relative to the label. */
export interface ICategoryIconLayout {
  position: CategoryIconPosition;
  width: number;
  height: number;
}

/** Default icon layout — matches the current icon-over-label vibe tab (40px). */
export const DEFAULT_CATEGORY_ICON_SIZE = 40;
export const CATEGORY_ICON_POSITIONS: CategoryIconPosition[] = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];

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
  /** CATEGORY level only: per-surface icon placement + size in the vibe tabber. */
  icon_layout_mweb?: ICategoryIconLayout;
  icon_layout_native?: ICategoryIconLayout;
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

const iconLayoutSchema = new Schema<ICategoryIconLayout>(
  {
    position: { type: String, enum: CATEGORY_ICON_POSITIONS, default: 'TOP' },
    width: { type: Number, default: DEFAULT_CATEGORY_ICON_SIZE, min: 1, max: 200 },
    height: { type: Number, default: DEFAULT_CATEGORY_ICON_SIZE, min: 1, max: 200 },
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
    // CATEGORY level only: how the icon is laid out in the home vibe tabber, set
    // independently for mWeb and the native app (undefined → client default).
    icon_layout_mweb: { type: iconLayoutSchema, default: undefined },
    icon_layout_native: { type: iconLayoutSchema, default: undefined },
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
