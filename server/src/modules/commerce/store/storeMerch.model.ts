import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Merchandising: curated collections and the home page they are arranged on.
 * Both are built in the ecomm portal; the storefront renders whatever is active
 * and in its window, in `sort_order`.
 */

export type StoreCollectionMode = 'MANUAL' | 'SMART';
export const STORE_COLLECTION_MODES: StoreCollectionMode[] = ['MANUAL', 'SMART'];

/** The rules a SMART collection matches listed products by. Empty = no constraint. */
export interface IStoreCollectionRules {
  pet_type_ids: Types.ObjectId[];
  category_ids: Types.ObjectId[];
  brand_ids: Types.ObjectId[];
  tags: string[];
  min_discount_pct: number;
  max_price: number;
  featured_only: boolean;
  in_stock_only: boolean;
}

export interface IStoreCollection extends Document {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  banner_url: string;
  mode: StoreCollectionMode;
  product_ids: Types.ObjectId[];
  rules: IStoreCollectionRules;
  sort_order: number;
  is_active: boolean;
  seo_title: string;
  seo_description: string;
  created_at: Date;
  updated_at: Date;
}

const rulesSchema = new Schema<IStoreCollectionRules>(
  {
    pet_type_ids: { type: [Schema.Types.ObjectId], ref: 'StorePetType', default: [] },
    category_ids: { type: [Schema.Types.ObjectId], ref: 'StoreCategory', default: [] },
    brand_ids: { type: [Schema.Types.ObjectId], ref: 'StoreBrand', default: [] },
    tags: { type: [String], default: [] },
    min_discount_pct: { type: Number, default: 0, min: 0, max: 100 },
    max_price: { type: Number, default: 0, min: 0 },
    featured_only: { type: Boolean, default: false },
    in_stock_only: { type: Boolean, default: false },
  },
  { _id: false }
);

const collectionSchema = new Schema<IStoreCollection>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    image_url: { type: String, default: '', trim: true },
    banner_url: { type: String, default: '', trim: true },
    mode: { type: String, enum: STORE_COLLECTION_MODES, default: 'MANUAL' },
    product_ids: { type: [Schema.Types.ObjectId], ref: 'StoreProduct', default: [] },
    rules: { type: rulesSchema, default: () => ({}) },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    seo_title: { type: String, default: '', trim: true, maxlength: 160 },
    seo_description: { type: String, default: '', trim: true, maxlength: 320 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreCollectionModel = model<IStoreCollection>('StoreCollection', collectionSchema);

/** What a home-page block shows. The storefront has one renderer per kind. */
export type StoreHomeSectionKind =
  | 'HERO_SLIDER'
  | 'PET_TYPES'
  | 'CATEGORY_GRID'
  | 'COLLECTION_CAROUSEL'
  | 'PROMO_BANNERS'
  | 'BRANDS'
  | 'USP_STRIP'
  | 'NEWSLETTER'
  | 'FLASH_SALE'
  | 'PRODUCT_SLIDER'
  | 'CATEGORY_ICONS';

export const STORE_HOME_SECTION_KINDS: StoreHomeSectionKind[] = [
  'HERO_SLIDER',
  'PET_TYPES',
  'CATEGORY_GRID',
  'COLLECTION_CAROUSEL',
  'PROMO_BANNERS',
  'BRANDS',
  'USP_STRIP',
  'NEWSLETTER',
  'FLASH_SALE',
  'PRODUCT_SLIDER',
  'CATEGORY_ICONS',
];

/** Where a PRODUCT_SLIDER takes its products from. */
export type StoreSectionProductSource =
  | 'MANUAL'
  | 'COLLECTION'
  | 'CATEGORY'
  | 'BESTSELLING'
  | 'NEWEST'
  | 'DISCOUNT'
  | 'FEATURED';

export const STORE_SECTION_PRODUCT_SOURCES: StoreSectionProductSource[] = [
  'MANUAL',
  'COLLECTION',
  'CATEGORY',
  'BESTSELLING',
  'NEWEST',
  'DISCOUNT',
  'FEATURED',
];

/** One slide / tile / badge inside a block. */
export interface IStoreSectionItem {
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  cta_label: string;
  link: string;
}

export interface IStoreHomeSection extends Document {
  kind: StoreHomeSectionKind;
  title: string;
  subtitle: string;
  items: IStoreSectionItem[];
  collection_id: Types.ObjectId | null;
  category_ids: Types.ObjectId[];
  product_limit: number;
  /** A FLASH_SALE's discount tabs (10, 20, 30…): each shows products at least that much off. */
  discount_tiers: number[];
  product_source: StoreSectionProductSource;
  /** Hand-picked products for a MANUAL slider, in the order they show. */
  product_ids: Types.ObjectId[];
  sort_order: number;
  is_active: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const sectionItemSchema = new Schema<IStoreSectionItem>(
  {
    title: { type: String, default: '', trim: true, maxlength: 120 },
    subtitle: { type: String, default: '', trim: true, maxlength: 240 },
    image_url: { type: String, default: '', trim: true },
    mobile_image_url: { type: String, default: '', trim: true },
    cta_label: { type: String, default: '', trim: true, maxlength: 40 },
    link: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { _id: true }
);

const homeSectionSchema = new Schema<IStoreHomeSection>(
  {
    kind: { type: String, enum: STORE_HOME_SECTION_KINDS, required: true },
    title: { type: String, default: '', trim: true, maxlength: 120 },
    subtitle: { type: String, default: '', trim: true, maxlength: 240 },
    items: { type: [sectionItemSchema], default: [] },
    collection_id: { type: Schema.Types.ObjectId, ref: 'StoreCollection', default: null },
    category_ids: { type: [Schema.Types.ObjectId], ref: 'StoreCategory', default: [] },
    product_limit: { type: Number, default: 12, min: 1, max: 48 },
    discount_tiers: { type: [Number], default: [] },
    product_source: { type: String, enum: STORE_SECTION_PRODUCT_SOURCES, default: 'COLLECTION' },
    product_ids: { type: [Schema.Types.ObjectId], ref: 'StoreProduct', default: [] },
    sort_order: { type: Number, default: 0, index: true },
    is_active: { type: Boolean, default: true },
    starts_at: { type: Date, default: null },
    ends_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreHomeSectionModel = model<IStoreHomeSection>('StoreHomeSection', homeSectionSchema);
