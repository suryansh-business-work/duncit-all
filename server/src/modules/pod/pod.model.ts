import { Schema, model, Types, type Document } from 'mongoose';

export type PodType = 'NATIVE_FREE' | 'NATIVE_PAID' | 'NATIVE_PAID_PREMIUM' | 'NON_NATIVE_FREE' | 'NON_NATIVE_PAID';
export type PodOccurrence = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALTERNATE_DAY' | 'WEEKENDS_ONLY';
export type PodMode = 'PHYSICAL' | 'VIRTUAL';

export interface IPodMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export interface IPodPlaceCharge {
  label: string;
  amount: number;
  note?: string | null;
}

export interface IPodProductRequest {
  product_id: Types.ObjectId;
  product_name: string;
  image_url: string;
  images: string[];
  unit_cost: number;
  quantity: number;
  total_cost: number;
}

export interface IPodComment {
  _id?: Types.ObjectId;
  author_id: Types.ObjectId;
  text: string;
  created_at: Date;
}

export interface IPod extends Document {
  pod_id: string;
  pod_title: string;
  pod_hosts_id: Types.ObjectId[];
  location_id?: Types.ObjectId | null;
  venue_id?: Types.ObjectId | null;
  club_id: Types.ObjectId;
  zone_name?: string | null;
  pod_mode: PodMode;
  meeting_platform?: string | null;
  meeting_url?: string | null;
  meeting_notes?: string | null;
  pod_hashtag: string[];
  pod_images_and_videos: IPodMedia[];
  pod_hits: number;
  pod_attendees: Types.ObjectId[];
  pod_description: string;
  pod_date_time: Date;
  pod_end_date_time?: Date | null;
  pod_type: PodType;
  pod_amount: number;
  pod_occurrence: PodOccurrence;
  no_of_spots: number;
  pod_info?: string;
  what_this_pod_offers: string[];
  available_perks: string[];
  payment_terms?: string | null;
  place_charges: IPodPlaceCharge[];
  products_enabled: boolean;
  product_requests: IPodProductRequest[];
  product_cost_total: number;
  liked_user_ids: Types.ObjectId[];
  comments: IPodComment[];
  completed_at?: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const mediaSchema = new Schema<IPodMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
  },
  { _id: false }
);

const placeChargeSchema = new Schema<IPodPlaceCharge>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0, max: 100000 },
    note: { type: String, default: null, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const productRequestSchema = new Schema<IPodProductRequest>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
    product_name: { type: String, required: true, trim: true },
    image_url: { type: String, default: '' },
    images: { type: [String], default: [] },
    unit_cost: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total_cost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const commentSchema = new Schema<IPodComment>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const podSchema = new Schema<IPod>(
  {
    // Slug is unique per club via a compound index below, not globally.
    pod_id: { type: String, required: true, lowercase: true, trim: true, index: true },
    pod_title: { type: String, required: true, trim: true },
    pod_hosts_id: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null, index: true },
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    zone_name: { type: String, default: null, trim: true },
    pod_mode: { type: String, enum: ['PHYSICAL', 'VIRTUAL'], default: 'PHYSICAL', required: true },
    meeting_platform: { type: String, default: null, trim: true, maxlength: 80 },
    meeting_url: { type: String, default: null, trim: true, maxlength: 1000 },
    meeting_notes: { type: String, default: null, trim: true, maxlength: 1000 },
    pod_hashtag: { type: [String], default: [] },
    pod_images_and_videos: { type: [mediaSchema], default: [] },
    pod_hits: { type: Number, default: 0 },
    pod_attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pod_description: { type: String, required: true },
    pod_date_time: { type: Date, required: true },
    pod_end_date_time: { type: Date, default: null },
    pod_type: {
      type: String,
      enum: ['NATIVE_FREE', 'NATIVE_PAID', 'NATIVE_PAID_PREMIUM', 'NON_NATIVE_FREE', 'NON_NATIVE_PAID'],
      required: true,
    },
    pod_amount: { type: Number, default: 0, min: 0, max: 1999 },
    pod_occurrence: {
      type: String,
      enum: ['ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'ALTERNATE_DAY', 'WEEKENDS_ONLY'],
      default: 'ONE_TIME',
    },
    no_of_spots: { type: Number, default: 0 },
    pod_info: { type: String, default: '' },
    what_this_pod_offers: { type: [String], default: [] },
    available_perks: { type: [String], default: [] },
    payment_terms: { type: String, default: null, trim: true, maxlength: 4000 },
    place_charges: { type: [placeChargeSchema], default: [] },
    products_enabled: { type: Boolean, default: false },
    product_requests: { type: [productRequestSchema], default: [] },
    product_cost_total: { type: Number, default: 0, min: 0 },
    liked_user_ids: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    comments: { type: [commentSchema], default: [] },
    completed_at: { type: Date, default: null, index: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Slug must be unique inside a club; same title can be reused across clubs.
podSchema.index({ club_id: 1, pod_id: 1 }, { unique: true });
podSchema.index({ club_id: 1, pod_date_time: -1 });
podSchema.index({ location_id: 1, zone_name: 1, pod_date_time: -1 });
podSchema.index({ venue_id: 1, pod_date_time: -1 });

export const PodModel = model<IPod>('Pod', podSchema);
