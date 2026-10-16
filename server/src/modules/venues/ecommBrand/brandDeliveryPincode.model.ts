import { Schema, model, Types, type Document } from 'mongoose';

/** Indian 6-digit PIN code (first digit 1–9) — server twin of @duncit/regex PINCODE. */
export const BRAND_PINCODE = /^[1-9]\d{5}$/;

/**
 * One pincode a partner brand delivers to. A brand with no rows delivers
 * everywhere; once it has any, the Pod Shop shows its products only to buyers
 * whose delivery pincode is listed and not marked unserviceable.
 *
 * `serviceable` is null until a ShipRocket sync has checked the lane from the
 * brand's primary warehouse — an unchecked pincode counts as deliverable,
 * because an admin listed it on purpose.
 */
export interface IBrandDeliveryPincode extends Document {
  brand_id: Types.ObjectId;
  pincode: string;
  serviceable: boolean | null;
  courier_name: string;
  etd: string;
  checked_at: Date | null;
  sync_error: string;
  created_by_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const brandDeliveryPincodeSchema = new Schema<IBrandDeliveryPincode>(
  {
    brand_id: { type: Schema.Types.ObjectId, ref: 'EcommBrand', required: true },
    pincode: { type: String, required: true, trim: true, match: BRAND_PINCODE },
    serviceable: { type: Boolean, default: null },
    courier_name: { type: String, default: '', trim: true, maxlength: 120 },
    etd: { type: String, default: '', trim: true, maxlength: 60 },
    checked_at: { type: Date, default: null },
    sync_error: { type: String, default: '', trim: true, maxlength: 300 },
    created_by_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

brandDeliveryPincodeSchema.index({ brand_id: 1, pincode: 1 }, { unique: true });
// The Pod Shop filter asks "which brands deliver to this pincode".
brandDeliveryPincodeSchema.index({ pincode: 1, serviceable: 1 });

export const BrandDeliveryPincodeModel = model<IBrandDeliveryPincode>(
  'BrandDeliveryPincode',
  brandDeliveryPincodeSchema
);
