import { Schema, model, type Document, type Types } from 'mongoose';

export type InventoryStatus = 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK' | 'ARCHIVED';
export type InventoryVisibility = 'PUBLIC' | 'INTERNAL';
export type ProductType = 'CONSUMABLE' | 'MERCHANDISE' | 'EQUIPMENT';
export type ProductListingReviewStatus = 'PENDING' | 'APPROVED' | 'DENIED';
export type ProductListingDeliveryTarget = 'HOST' | 'VENUE';
export type UnitType =
  | 'BOTTLE'
  | 'PIECE'
  | 'PACKET'
  | 'BOX'
  | 'KG'
  | 'LITRE'
  | 'METER'
  | 'OTHER';

export interface IInventoryProduct extends Document {
  product_name: string;
  sku: string;
  barcode: string;
  short_description: string;
  description: string;

  category_id: Types.ObjectId | null;
  // E-commerce brand this product belongs to + the 3-level taxonomy (the same
  // Category collection pods use): super → category (category_id) → sub.
  brand_id: Types.ObjectId | null;
  super_category_id: Types.ObjectId | null;
  sub_category_id: Types.ObjectId | null;
  brand_name: string;
  product_type: ProductType;
  unit_type: UnitType;

  image_url: string;
  images: string[];

  min_order_qty: number;
  max_order_qty: number;
  low_stock_alert: number;
  inventory_count: number;
  reserved_count: number;
  damaged_count: number;
  requested_count: number;

  vendor_name: string;
  supplier_contact: string;

  unit_cost: number;
  purchase_price: number;
  selling_price: number;
  tax_percent: number;
  discount_percent: number;

  weight_volume: string;
  expiry_date: Date | null;
  manufacturing_date: Date | null;
  batch_number: string;
  storage_instructions: string;

  status: InventoryStatus;
  visibility: InventoryVisibility;
  tags: string[];

  pod_available: boolean;
  host_request_allowed: boolean;
  delivery_available: boolean;
  delivery_charge: number;

  listing_review_status: ProductListingReviewStatus;
  listing_review_notes: string;
  listing_submitted_by_id: string | null;
  listing_submitted_by_name: string;
  listing_reviewed_by_id: string | null;
  listing_reviewed_by_name: string;
  is_duncit_delivery_partner: boolean;
  size_label: string;
  height_cm: number;
  weight_kg: number;
  color: string;
  commission_pct: number;
  delivery_target: ProductListingDeliveryTarget;

  is_active: boolean;

  last_updated_by_id: string | null;
  last_updated_by_name: string;

  created_at: Date;
  updated_at: Date;
}

const productSchema = new Schema<IInventoryProduct>(
  {
    product_name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 50 },
    barcode: { type: String, default: '', trim: true, maxlength: 80 },
    short_description: { type: String, default: '', trim: true, maxlength: 280 },
    description: { type: String, default: '', trim: true, maxlength: 4000 },

    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    brand_id: { type: Schema.Types.ObjectId, ref: 'EcommBrand', default: null, index: true },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    brand_name: { type: String, default: '', trim: true, maxlength: 120 },
    product_type: {
      type: String,
      enum: ['CONSUMABLE', 'MERCHANDISE', 'EQUIPMENT'],
      default: 'CONSUMABLE',
    },
    unit_type: {
      type: String,
      enum: ['BOTTLE', 'PIECE', 'PACKET', 'BOX', 'KG', 'LITRE', 'METER', 'OTHER'],
      default: 'PIECE',
    },

    image_url: { type: String, default: '', trim: true },
    images: { type: [String], default: [] },

    min_order_qty: { type: Number, default: 1, min: 0 },
    max_order_qty: { type: Number, default: 100, min: 0 },
    low_stock_alert: { type: Number, default: 5, min: 0 },
    inventory_count: { type: Number, required: true, min: 0, default: 0 },
    reserved_count: { type: Number, default: 0, min: 0 },
    damaged_count: { type: Number, default: 0, min: 0 },
    requested_count: { type: Number, required: true, min: 0, default: 0 },

    vendor_name: { type: String, default: '', trim: true, maxlength: 120 },
    supplier_contact: { type: String, default: '', trim: true, maxlength: 120 },

    unit_cost: { type: Number, required: true, min: 0, max: 1000000 },
    purchase_price: { type: Number, default: 0, min: 0 },
    selling_price: { type: Number, default: 0, min: 0 },
    tax_percent: { type: Number, default: 0, min: 0, max: 100 },
    discount_percent: { type: Number, default: 0, min: 0, max: 100 },

    weight_volume: { type: String, default: '', trim: true, maxlength: 60 },
    expiry_date: { type: Date, default: null },
    manufacturing_date: { type: Date, default: null },
    batch_number: { type: String, default: '', trim: true, maxlength: 60 },
    storage_instructions: { type: String, default: '', trim: true, maxlength: 500 },

    status: {
      type: String,
      enum: ['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'INTERNAL'],
      default: 'PUBLIC',
    },
    tags: { type: [String], default: [] },

    pod_available: { type: Boolean, default: true },
    host_request_allowed: { type: Boolean, default: true },
    delivery_available: { type: Boolean, default: false },
    delivery_charge: { type: Number, default: 0, min: 0 },

    listing_review_status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DENIED'],
      default: 'APPROVED',
      index: true,
    },
    listing_review_notes: { type: String, default: '', trim: true, maxlength: 1000 },
    listing_submitted_by_id: { type: String, default: null },
    listing_submitted_by_name: { type: String, default: '' },
    listing_reviewed_by_id: { type: String, default: null },
    listing_reviewed_by_name: { type: String, default: '' },
    is_duncit_delivery_partner: { type: Boolean, default: false },
    size_label: { type: String, default: '', trim: true, maxlength: 120 },
    height_cm: { type: Number, default: 0, min: 0 },
    weight_kg: { type: Number, default: 0, min: 0 },
    color: { type: String, default: '', trim: true, maxlength: 80 },
    commission_pct: { type: Number, default: 5, min: 5, max: 50 },
    delivery_target: { type: String, enum: ['HOST', 'VENUE'], default: 'HOST' },

    is_active: { type: Boolean, default: true },

    last_updated_by_id: { type: String, default: null },
    last_updated_by_name: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

productSchema.index({ product_name: 1 });
productSchema.index({ status: 1, visibility: 1 });
productSchema.index({ tags: 1 });

export const InventoryProductModel = model<IInventoryProduct>(
  'InventoryProduct',
  productSchema
);
