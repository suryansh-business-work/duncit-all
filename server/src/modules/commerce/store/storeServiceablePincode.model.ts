import { Schema, model, type Document } from 'mongoose';

/** An Indian PIN: six digits, never starting with 0 — twin of `PINCODE` in @duncit/regex (rule 40). */
export const INDIAN_PINCODE = /^[1-9]\d{5}$/;

/**
 * A pincode the pet store delivers to, kept in the ecomm portal's Serviceable
 * pincodes page. Once the store keeps any, only the active ones are served —
 * the delivery check, the product page and checkout all refuse the rest. With
 * none at all, every pincode the courier can reach is served.
 */
export interface IStoreServiceablePincode extends Document {
  pincode: string;
  area: string;
  city: string;
  state: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const serviceablePincodeSchema = new Schema<IStoreServiceablePincode>(
  {
    pincode: { type: String, required: true, trim: true, match: INDIAN_PINCODE, unique: true },
    area: { type: String, default: '', trim: true, maxlength: 120 },
    city: { type: String, default: '', trim: true, maxlength: 120 },
    state: { type: String, default: '', trim: true, maxlength: 120 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreServiceablePincodeModel = model<IStoreServiceablePincode>(
  'StoreServiceablePincode',
  serviceablePincodeSchema
);

/** Whether the store limits delivery to its own list — true once it keeps any pincode, active or not. */
export async function restrictsPincodes(): Promise<boolean> {
  return (await StoreServiceablePincodeModel.exists({})) !== null;
}

/** Whether the store's own list allows delivery to `pincode` (always, while it keeps no list). */
export async function isPincodeServed(pincode: string): Promise<boolean> {
  const clean = String(pincode ?? '').trim();
  const [listed, restricted] = await Promise.all([
    StoreServiceablePincodeModel.exists({ pincode: clean, is_active: true }),
    restrictsPincodes(),
  ]);
  return listed !== null || !restricted;
}
