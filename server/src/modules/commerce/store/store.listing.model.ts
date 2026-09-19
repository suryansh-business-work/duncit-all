import { Schema, type Types } from 'mongoose';

/**
 * How a store product appears on the pet store (ecomm.duncit.com): where it is
 * filed, what it is called on the shelf, and the copy a shopper reads. It is a
 * subdocument of `StoreProduct`; stock and the selling price stay on the
 * product (and its variants). Whether it is on the shelf at all is the
 * product's `status` (PUBLISHED), not a flag in here.
 */
export interface IStoreFacetValue {
  facet_id: Types.ObjectId;
  /** Value slugs chosen from that facet, e.g. ['puppy', 'adult']. */
  values: string[];
}

export interface IStoreSpecification {
  label: string;
  value: string;
}

/** One question shoppers ask about the product, answered on its page. */
export interface IStoreFaq {
  question: string;
  answer: string;
}

export interface IStoreListing {
  /** Public URL key — ecomm.duncit.com/p/<slug>. Unique among published products. */
  slug: string;
  /** Shelf name; empty means the product's own name. */
  title: string;
  pet_type_ids: Types.ObjectId[];
  category_ids: Types.ObjectId[];
  facet_values: IStoreFacetValue[];
  /** Compare-at price (MRP). 0 = no strike-through price. */
  mrp: number;
  highlights: string[];
  specifications: IStoreSpecification[];
  ingredients: string;
  feeding_guide: string;
  care_instructions: string;
  badge: string;
  featured: boolean;
  sort_rank: number;
  seo_title: string;
  seo_description: string;
  search_keywords: string[];
  video_url: string;
  cod_available: boolean;
  returnable: boolean;
  /** Days a buyer may ask for a return; null = the store default. */
  return_window_days: number | null;
  /** Most units one order may carry; 0 = the store-wide cap. */
  max_per_order: number;
  /** A short offer line beside the price ("Buy 2, get 1 free"); '' = none. */
  offer_text: string;
  faqs: IStoreFaq[];
  sold_count: number;
  view_count: number;
  wishlist_count: number;
  /** When the product was first published. */
  listed_at: Date | null;
}

const facetValueSchema = new Schema<IStoreFacetValue>(
  {
    facet_id: { type: Schema.Types.ObjectId, ref: 'StoreFacet', required: true },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

const specificationSchema = new Schema<IStoreSpecification>(
  {
    label: { type: String, default: '', trim: true, maxlength: 80 },
    value: { type: String, default: '', trim: true, maxlength: 400 },
  },
  { _id: false }
);

const faqSchema = new Schema<IStoreFaq>(
  {
    question: { type: String, default: '', trim: true, maxlength: 200 },
    answer: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { _id: false }
);

export const storeListingSchema = new Schema<IStoreListing>(
  {
    slug: { type: String, default: '', trim: true, lowercase: true, maxlength: 160 },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    pet_type_ids: { type: [Schema.Types.ObjectId], ref: 'StorePetType', default: [] },
    category_ids: { type: [Schema.Types.ObjectId], ref: 'StoreCategory', default: [] },
    facet_values: { type: [facetValueSchema], default: [] },
    mrp: { type: Number, default: 0, min: 0 },
    highlights: { type: [String], default: [] },
    specifications: { type: [specificationSchema], default: [] },
    ingredients: { type: String, default: '', maxlength: 8000 },
    feeding_guide: { type: String, default: '', maxlength: 20000 },
    care_instructions: { type: String, default: '', maxlength: 20000 },
    badge: { type: String, default: '', trim: true, maxlength: 40 },
    featured: { type: Boolean, default: false },
    sort_rank: { type: Number, default: 0 },
    seo_title: { type: String, default: '', trim: true, maxlength: 160 },
    seo_description: { type: String, default: '', trim: true, maxlength: 320 },
    search_keywords: { type: [String], default: [] },
    video_url: { type: String, default: '', trim: true },
    cod_available: { type: Boolean, default: true },
    returnable: { type: Boolean, default: true },
    return_window_days: { type: Number, default: null, min: 0, max: 365 },
    max_per_order: { type: Number, default: 0, min: 0 },
    offer_text: { type: String, default: '', trim: true, maxlength: 80 },
    faqs: { type: [faqSchema], default: [] },
    sold_count: { type: Number, default: 0, min: 0 },
    view_count: { type: Number, default: 0, min: 0 },
    wishlist_count: { type: Number, default: 0, min: 0 },
    listed_at: { type: Date, default: null },
  },
  { _id: false }
);

/** A product with no listing yet reads as an empty one. */
export const EMPTY_STORE_LISTING: IStoreListing = {
  slug: '',
  title: '',
  pet_type_ids: [],
  category_ids: [],
  facet_values: [],
  mrp: 0,
  highlights: [],
  specifications: [],
  ingredients: '',
  feeding_guide: '',
  care_instructions: '',
  badge: '',
  featured: false,
  sort_rank: 0,
  seo_title: '',
  seo_description: '',
  search_keywords: [],
  video_url: '',
  cod_available: true,
  returnable: true,
  return_window_days: null,
  max_per_order: 0,
  offer_text: '',
  faqs: [],
  sold_count: 0,
  view_count: 0,
  wishlist_count: 0,
  listed_at: null,
};
