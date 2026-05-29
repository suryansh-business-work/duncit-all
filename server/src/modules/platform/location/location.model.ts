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
  created_at: Date;
  updated_at: Date;
}

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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const LocationModel = model<ILocation>('Location', locationSchema);
