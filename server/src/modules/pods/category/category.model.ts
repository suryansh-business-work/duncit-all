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
  /** Artwork for the gift card sold under this category — the two faces of the
   * printed card. Every level may carry them; empty means "no artwork", and the
   * clients then render their generated gradient card exactly as before. */
  gift_card_image_front: string;
  gift_card_image_back: string;
  /** SUB level only: may a host invite co-hosts to a pod in this sub-category? */
  allow_co_hosts: boolean;
  /** SUB level only: how many co-hosts a single pod may carry (1-5). Only
   * meaningful while allow_co_hosts is true. */
  max_co_hosts: number;
  /** SUB level only: the fewest people this activity needs to work (a doubles
   * game needs 4). The host cannot go below it when sizing a pod — their spots
   * slider starts here and runs up to the venue's capacity. 0 = unset, which
   * imposes no floor. */
  min_pax: number;
  created_at: Date;
  updated_at: Date;
}

/** Bounds for ICategory.max_co_hosts — shared with the schema + validators. */
export const MIN_CO_HOSTS = 1;
export const MAX_CO_HOSTS = 5;

/** Bounds for ICategory.min_pax. 0 means "no minimum set for this activity". */
export const MIN_PAX_FLOOR = 0;
export const MIN_PAX_CEILING = 50;

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
    // The gift card's two faces, uploaded per category in Admin > Categories.
    // Empty on every existing row, which is exactly the "no artwork" case.
    gift_card_image_front: { type: String, default: '', trim: true },
    gift_card_image_back: { type: String, default: '', trim: true },
    // Co-hosting is configured per SUB-category by an admin. Defaults keep every
    // existing sub-category behaving exactly as before (no co-hosts).
    allow_co_hosts: { type: Boolean, default: false },
    max_co_hosts: {
      type: Number,
      default: MIN_CO_HOSTS,
      min: MIN_CO_HOSTS,
      max: MAX_CO_HOSTS,
    },
    // Set per SUB-category by an admin. The default of 0 leaves every existing
    // sub-category exactly as it is today — no floor on pod size.
    min_pax: {
      type: Number,
      default: MIN_PAX_FLOOR,
      min: MIN_PAX_FLOOR,
      max: MIN_PAX_CEILING,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

categorySchema.index({ parent_id: 1, slug: 1 }, { unique: true });
categorySchema.index({ level: 1, parent_id: 1 });

export const CategoryModel = model<ICategory>('Category', categorySchema);
