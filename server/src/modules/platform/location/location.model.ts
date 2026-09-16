import { Schema, model, type Document } from 'mongoose';

export interface ILocationZone {
  zone_name: string;
  zone_code?: string;
  pincode?: string;
}

export interface ILocation extends Document {
  location_id: string;
  location_name: string;
  country: string;
  country_code: string;
  state: string;
  state_code: string;
  city: string;
  location_image: string;
  location_pincode: string;
  location_zones: ILocationZone[];
  is_active: boolean;
  /** Off: the city is listed in the app but opens its subscribe-for-launch page. */
  is_launched: boolean;
  /** The subscriber goal the subscribe page shows. */
  launch_target: number;
  /** Optional chat.whatsapp.com invite link; '' when unset. */
  whatsapp_group_url: string;
  created_at: Date;
  updated_at: Date;
}

/** The launch goal a city gets when an admin sets none. */
export const DEFAULT_LAUNCH_TARGET = 2000;
export const MAX_LAUNCH_TARGET = 1_000_000;

const zoneSchema = new Schema<ILocationZone>(
  {
    zone_name: { type: String, required: true, trim: true },
    zone_code: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  { _id: false }
);

const locationSchema = new Schema<ILocation>(
  {
    location_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    location_name: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    country_code: { type: String, default: 'IN', uppercase: true, trim: true },
    state: { type: String, default: '', trim: true },
    state_code: { type: String, default: '', uppercase: true, trim: true },
    city: { type: String, default: '', trim: true },
    location_image: { type: String, required: true },
    location_pincode: { type: String, required: true, trim: true },
    location_zones: { type: [zoneSchema], default: [] },
    is_active: { type: Boolean, default: true },
    is_launched: { type: Boolean, default: true },
    launch_target: { type: Number, default: DEFAULT_LAUNCH_TARGET, min: 1, max: MAX_LAUNCH_TARGET },
    whatsapp_group_url: { type: String, default: '', trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const LocationModel = model<ILocation>('Location', locationSchema);
