import { Schema, model, type Document, Types } from 'mongoose';

/** A saved delivery/billing address in the user's address book (Profile
 * Settings). Selected at checkout to prefill billing + shipping. */
export interface IUserAddress extends Document {
  user_id: Types.ObjectId;
  label: string;
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

const userAddressSchema = new Schema<IUserAddress>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: 'Home', trim: true, maxlength: 60 },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    email: { type: String, default: '', trim: true, maxlength: 160 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, default: '', trim: true, maxlength: 200 },
    landmark: { type: String, default: '', trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    state: { type: String, required: true, trim: true, maxlength: 120 },
    pincode: { type: String, required: true, trim: true, maxlength: 12 },
    country: { type: String, default: 'India', trim: true, maxlength: 80 },
    is_default: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const UserAddressModel = model<IUserAddress>('UserAddress', userAddressSchema);
