import { Document, Schema, Types, model } from 'mongoose';

export type AdMediaType = 'IMAGE' | 'VIDEO';
export type AdStoredStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
/** PLACEMENT = a generic advertiser slot; PRODUCT_AD / BRAND_AD = a brand promoting
 * one of its products / its storefront from the Partner portal. */
export type AdKind = 'PLACEMENT' | 'PRODUCT_AD' | 'BRAND_AD';
export const AD_KINDS: AdKind[] = ['PLACEMENT', 'PRODUCT_AD', 'BRAND_AD'];
export type AdPosition =
  | 'AUTO'
  | 'HOME_BOTTOM'
  | 'SIDEBAR'
  | 'EXPLORE_SCROLL'
  | 'STATUS'
  | 'VENUE_LIST'
  | 'CLUB_LIST'
  | 'POD_LIST'
  | 'POD_DETAILS';

export const AD_POSITIONS: AdPosition[] = [
  'AUTO',
  'HOME_BOTTOM',
  'SIDEBAR',
  'EXPLORE_SCROLL',
  'STATUS',
  'VENUE_LIST',
  'CLUB_LIST',
  'POD_LIST',
  'POD_DETAILS',
];

export interface IAdRequest extends Document {
  trace_id: string;
  ad_kind: AdKind;
  brand_id?: Types.ObjectId | null;
  product_id?: Types.ObjectId | null;
  brand_name?: string | null;
  product_name?: string | null;
  product_image?: string | null;
  ad_title: string;
  ad_description: string;
  ad_type: AdMediaType;
  media_url: string;
  position: AdPosition;
  start_at: Date;
  duration_days: number;
  /** Derived at submit: start_at + duration_days. Stored so activeAds can query it. */
  end_at: Date;
  redirect_url?: string | null;
  target_audience?: string | null;
  /** Stored review state. LIVE/EXPIRED are derived from dates at read time. */
  status: AdStoredStatus;
  marketing_remarks?: string | null;
  /** Cost quoted from AdPricing at submission time. */
  estimated_cost: number;
  /** Cost frozen at approval time (pricing may change later). */
  approved_cost?: number | null;
  submitted_by: Types.ObjectId;
  reviewed_by?: Types.ObjectId | null;
  reviewed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const adRequestSchema = new Schema<IAdRequest>(
  {
    trace_id: { type: String, required: true, unique: true, index: true },
    ad_kind: { type: String, enum: AD_KINDS, default: 'PLACEMENT', index: true },
    brand_id: { type: Schema.Types.ObjectId, ref: 'EcommBrand', default: null, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', default: null, index: true },
    brand_name: { type: String, default: null, trim: true, maxlength: 160 },
    product_name: { type: String, default: null, trim: true, maxlength: 200 },
    product_image: { type: String, default: null, trim: true, maxlength: 1000 },
    ad_title: { type: String, required: true, trim: true, maxlength: 120 },
    ad_description: { type: String, required: true, trim: true, maxlength: 2000 },
    ad_type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
    media_url: { type: String, required: true, trim: true, maxlength: 1000 },
    position: { type: String, enum: AD_POSITIONS, required: true },
    start_at: { type: Date, required: true },
    duration_days: { type: Number, required: true, min: 1, max: 30 },
    end_at: { type: Date, required: true },
    redirect_url: { type: String, default: null, trim: true, maxlength: 1000 },
    target_audience: { type: String, default: null, trim: true, maxlength: 500 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    marketing_remarks: { type: String, default: null, trim: true, maxlength: 2000 },
    estimated_cost: { type: Number, required: true, min: 0 },
    approved_cost: { type: Number, default: null, min: 0 },
    submitted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The serving query: approved ads whose window covers "now", by position.
adRequestSchema.index({ status: 1, position: 1, start_at: 1, end_at: 1 });

export const AdRequestModel = model<IAdRequest>('AdRequest', adRequestSchema);

/** Per-position per-day pricing, editable by Marketing at runtime (no code changes). */
export interface IAdPricing extends Document {
  singleton_key: string;
  auto_per_day: number;
  home_bottom_per_day: number;
  sidebar_per_day: number;
  explore_scroll_per_day: number;
  status_per_day: number;
  venue_list_per_day: number;
  club_list_per_day: number;
  pod_list_per_day: number;
  pod_details_per_day: number;
  currency_symbol: string;
}

const priceField = { type: Number, default: 500, min: 0 };

const adPricingSchema = new Schema<IAdPricing>(
  {
    singleton_key: { type: String, unique: true, default: 'ads' },
    auto_per_day: priceField,
    home_bottom_per_day: priceField,
    sidebar_per_day: priceField,
    explore_scroll_per_day: priceField,
    status_per_day: priceField,
    venue_list_per_day: priceField,
    club_list_per_day: priceField,
    pod_list_per_day: priceField,
    pod_details_per_day: priceField,
    currency_symbol: { type: String, default: '₹' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AdPricingModel = model<IAdPricing>('AdPricing', adPricingSchema);

export async function getAdPricing(): Promise<IAdPricing> {
  const existing = await AdPricingModel.findOne({ singleton_key: 'ads' });
  if (existing) return existing;
  return AdPricingModel.create({ singleton_key: 'ads' });
}

/** Atomic sequential counter for human-readable ad trace ids (AD-000001). */
interface IAdTraceCounter extends Document {
  singleton_key: string;
  seq: number;
}

const adTraceCounterSchema = new Schema<IAdTraceCounter>({
  singleton_key: { type: String, unique: true, default: 'ad-trace' },
  seq: { type: Number, default: 0 },
});

const AdTraceCounterModel = model<IAdTraceCounter>('AdTraceCounter', adTraceCounterSchema);

export async function nextAdTraceId(): Promise<string> {
  const doc = await AdTraceCounterModel.findOneAndUpdate(
    { singleton_key: 'ad-trace' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `AD-${String(doc.seq).padStart(6, '0')}`;
}
