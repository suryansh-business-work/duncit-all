import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * How the pet store files its shelves: which pet a product is for, which aisle
 * (category) it sits in, the filters (facets) a shopper narrows by, and the
 * brands it sells. All are admin-managed from the ecomm portal — nothing here
 * is seeded, so the store shows exactly the taxonomy the team built.
 */

/** A pet the store sells for — Dogs, Cats, Birds, Fish… */
export interface IStorePetType extends Document {
  name: string;
  slug: string;
  icon_url: string;
  image_url: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const petTypeSchema = new Schema<IStorePetType>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    icon_url: { type: String, default: '', trim: true },
    image_url: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StorePetTypeModel = model<IStorePetType>('StorePetType', petTypeSchema);

/** An aisle — Food › Dry Food. A category with a parent is a sub-category. */
export interface IStoreCategory extends Document {
  name: string;
  slug: string;
  parent_id: Types.ObjectId | null;
  image_url: string;
  banner_url: string;
  description: string;
  pet_type_ids: Types.ObjectId[];
  sort_order: number;
  is_active: boolean;
  show_in_menu: boolean;
  seo_title: string;
  seo_description: string;
  created_at: Date;
  updated_at: Date;
}

const categorySchema = new Schema<IStoreCategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
    parent_id: { type: Schema.Types.ObjectId, ref: 'StoreCategory', default: null, index: true },
    image_url: { type: String, default: '', trim: true },
    banner_url: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    pet_type_ids: { type: [Schema.Types.ObjectId], ref: 'StorePetType', default: [] },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    show_in_menu: { type: Boolean, default: true },
    seo_title: { type: String, default: '', trim: true, maxlength: 160 },
    seo_description: { type: String, default: '', trim: true, maxlength: 320 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreCategoryModel = model<IStoreCategory>('StoreCategory', categorySchema);

/** One selectable value of a facet — "Puppy" under "Life stage". */
export interface IStoreFacetOption {
  label: string;
  slug: string;
}

/** A filter shoppers narrow a shelf by — Life stage, Breed size, Diet… */
export interface IStoreFacet extends Document {
  name: string;
  slug: string;
  options: IStoreFacetOption[];
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const facetOptionSchema = new Schema<IStoreFacetOption>(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  },
  { _id: false }
);

const facetSchema = new Schema<IStoreFacet>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    options: { type: [facetOptionSchema], default: [] },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreFacetModel = model<IStoreFacet>('StoreFacet', facetSchema);

/** A brand the store sells — the pet store's own list, run from the ecomm portal. */
export interface IStoreBrand extends Document {
  name: string;
  slug: string;
  logo_url: string;
  tagline: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const brandSchema = new Schema<IStoreBrand>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 100 },
    logo_url: { type: String, default: '', trim: true },
    tagline: { type: String, default: '', trim: true, maxlength: 160 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreBrandModel = model<IStoreBrand>('StoreBrand', brandSchema);
