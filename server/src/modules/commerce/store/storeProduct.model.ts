import { Schema, model, type Document, type Types } from 'mongoose';
import { storeListingSchema, type IStoreListing } from './store.listing.model';
import { PACKAGE_TYPES, type PackageType } from '@modules/venues/inventory/inventory.model';

/**
 * A product the pet store (ecomm.duncit.com) sells — its OWN catalogue, run
 * from the Ecomm portal and unrelated to the Products portal's inventory. The
 * field names match what an order, a stock movement and a ShipRocket parcel
 * already read (`product_name`, `unit_cost`, `inventory_count`, the parcel
 * dimensions), so the one order pipeline serves both catalogues.
 */

export type StoreProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export const STORE_PRODUCT_STATUSES: readonly StoreProductStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export interface IStoreProductVariant {
  _id: Types.ObjectId;
  /** What the shopper picks, e.g. "3 kg" or "Chicken / 1.2 kg". */
  option_label: string;
  sku: string;
  unit_cost: number;
  /** Compare-at price (MRP). 0 = no strike-through price. */
  mrp: number;
  inventory_count: number;
  images: string[];
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
}

export interface IStoreProduct extends Document {
  _id: Types.ObjectId;
  product_name: string;
  sku: string;
  /** One of the store's own brands (StoreBrand), or none. */
  brand_id: Types.ObjectId | null;
  /** That brand's name, copied on save so search and the table need no lookup. */
  brand_name: string;
  short_description: string;
  description: string;
  /** The first image is the cover. */
  images: string[];
  /** Selling price (₹). */
  unit_cost: number;
  /** Units on hand. With variants, the sum of the variants' own counts. */
  inventory_count: number;
  /** At or below this many units the product reads as "low stock". 0 = never. */
  low_stock_alert: number;
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  /** How a unit is packed for the courier. */
  package_type: PackageType;
  /** HSN code on the GST invoice (pet food 2309, toys 9503). */
  hsn_code: string;
  is_fragile: boolean;
  is_liquid: boolean;
  /** Days a sealed unit stays good (food, medicine); null when it doesn't expire. */
  shelf_life_days: number | null;
  /** The Duncit warehouse a parcel ships from (a ShipRocket pickup location). */
  pickup_location_id: Types.ObjectId | null;
  /** What the variants differ by, e.g. "Size" — the picker's heading on the store. */
  variant_option: string;
  variants: Types.DocumentArray<IStoreProductVariant & Document>;
  status: StoreProductStatus;
  store: IStoreListing;
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const variantSchema = new Schema<IStoreProductVariant>(
  {
    option_label: { type: String, default: '', trim: true, maxlength: 120 },
    sku: { type: String, default: '', uppercase: true, trim: true, maxlength: 60 },
    unit_cost: { type: Number, default: 0, min: 0, max: 1000000 },
    mrp: { type: Number, default: 0, min: 0, max: 1000000 },
    inventory_count: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    weight_kg: { type: Number, default: 0, min: 0 },
    length_cm: { type: Number, default: 0, min: 0 },
    breadth_cm: { type: Number, default: 0, min: 0 },
    height_cm: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const storeProductSchema = new Schema<IStoreProduct>(
  {
    product_name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 50 },
    brand_id: { type: Schema.Types.ObjectId, ref: 'StoreBrand', default: null, index: true },
    brand_name: { type: String, default: '', trim: true, maxlength: 120 },
    short_description: { type: String, default: '', trim: true, maxlength: 280 },
    description: { type: String, default: '', maxlength: 8000 },
    images: { type: [String], default: [] },
    unit_cost: { type: Number, default: 0, min: 0, max: 1000000 },
    inventory_count: { type: Number, default: 0, min: 0 },
    low_stock_alert: { type: Number, default: 0, min: 0 },
    weight_kg: { type: Number, default: 0, min: 0 },
    length_cm: { type: Number, default: 0, min: 0 },
    breadth_cm: { type: Number, default: 0, min: 0 },
    height_cm: { type: Number, default: 0, min: 0 },
    package_type: { type: String, enum: PACKAGE_TYPES, default: 'BOX' },
    hsn_code: { type: String, default: '', trim: true, maxlength: 8 },
    is_fragile: { type: Boolean, default: false },
    is_liquid: { type: Boolean, default: false },
    shelf_life_days: { type: Number, default: null, min: 0 },
    pickup_location_id: { type: Schema.Types.ObjectId, ref: 'BrandPickupLocation', default: null },
    variant_option: { type: String, default: '', trim: true, maxlength: 40 },
    variants: { type: [variantSchema], default: [] },
    status: { type: String, enum: STORE_PRODUCT_STATUSES, default: 'DRAFT', index: true },
    store: { type: storeListingSchema, default: () => ({}) },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'store_products' }
);

// The shelf's reads: a published product by slug, by pet and by category.
storeProductSchema.index(
  { 'store.slug': 1 },
  { unique: true, partialFilterExpression: { status: 'PUBLISHED' } }
);
storeProductSchema.index({ status: 1, 'store.pet_type_ids': 1, 'store.sort_rank': -1 });
storeProductSchema.index({ status: 1, 'store.category_ids': 1 });
storeProductSchema.index({ product_name: 1 });

export const StoreProductModel = model<IStoreProduct>('StoreProduct', storeProductSchema);
