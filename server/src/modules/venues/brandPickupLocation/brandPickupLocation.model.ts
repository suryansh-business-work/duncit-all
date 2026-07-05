import { Schema, model, Types, type Document } from 'mongoose';

export type PickupOwnerKind = 'DUNCIT' | 'BRAND';

export interface IBrandPickupLocation extends Document {
  owner_kind: PickupOwnerKind;
  brand_id: Types.ObjectId | null;
  nickname: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  shiprocket_registered: boolean;
  shiprocket_pickup_id: string;
  created_at: Date;
  updated_at: Date;
}

const brandPickupLocationSchema = new Schema<IBrandPickupLocation>(
  {
    owner_kind: { type: String, enum: ['DUNCIT', 'BRAND'], default: 'BRAND', index: true },
    brand_id: { type: Schema.Types.ObjectId, ref: 'EcommBrand', default: null, index: true },
    // ShipRocket pickup-location nickname — must be unique within the ShipRocket account.
    nickname: { type: String, required: true, trim: true, maxlength: 60 },
    contact_name: { type: String, default: '', trim: true, maxlength: 160 },
    phone: { type: String, default: '', trim: true, maxlength: 24 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    address_line1: { type: String, default: '', trim: true, maxlength: 200 },
    address_line2: { type: String, default: '', trim: true, maxlength: 200 },
    city: { type: String, default: '', trim: true, maxlength: 120 },
    state: { type: String, default: '', trim: true, maxlength: 120 },
    pincode: { type: String, default: '', trim: true, maxlength: 12 },
    country: { type: String, default: 'India', trim: true, maxlength: 80 },
    is_default: { type: Boolean, default: false },
    shiprocket_registered: { type: Boolean, default: false },
    shiprocket_pickup_id: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

brandPickupLocationSchema.index({ owner_kind: 1, brand_id: 1 });
brandPickupLocationSchema.index({ nickname: 1 }, { unique: true });

export const BrandPickupLocationModel = model<IBrandPickupLocation>(
  'BrandPickupLocation',
  brandPickupLocationSchema
);
