import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { BANNER_SIZES, BANNER_STYLES, POD_PROMO_SOURCES, POD_PROMO_STATUSES, PRICE_FILTERS, SLIDE_KINDS } from './podPromo.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

/**
 * The automatic pod promotion settings — one document, key 'default'.
 * `updated_by` is who last saved them: the planner files its posts under that
 * person, the same way an agent files its work under the person who saved it.
 */
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    enabled: { type: Boolean, default: false },
    days_before: { type: Number, default: 3, min: 1, max: 30 },
    post_hour: { type: Number, default: 18, min: 0, max: 23 },
    account_ids: { type: [String], default: [] },
    needs_approval: { type: Boolean, default: true },
    city_ids: { type: [String], default: [] },
    club_ids: { type: [String], default: [] },
    category_ids: { type: [String], default: [] },
    price_filter: { type: String, enum: PRICE_FILTERS, default: 'ALL' },
    min_days_until_start: { type: Number, default: 1, min: 0, max: 30 },
    banner_style: { type: String, enum: BANNER_SIZES, default: 'PORTRAIT' },
    cta_text: { type: String, default: '', trim: true, maxlength: 40 },
    utm_prefix: { type: String, default: 'pod-promo', trim: true, maxlength: 30 },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by_name: { type: String, default: '' },
  },
  { timestamps }
);

const slideSchema = new Schema(
  {
    kind: { type: String, enum: SLIDE_KINDS, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

/** What the promotion brought in, as last read from its tracking link. */
const figuresSchema = new Schema(
  {
    clicks: { type: Number, default: 0 },
    unique_visitors: { type: Number, default: 0 },
    signups: { type: Number, default: 0 },
    pod_views: { type: Number, default: 0 },
    checkouts: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    paid_bookings: { type: Number, default: 0 },
    payments: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    updated_at: { type: Date, default: null },
  },
  { _id: false }
);

/**
 * One pod's promotion. `pod_id` is unique: that index is what makes the
 * planner idempotent — two ticks (or a tick and a person) racing on one pod
 * collide here and only one goes on. Each step stores what it made before the
 * next starts, so a promotion that failed half-way resumes rather than
 * minting a second link or uploading a second carousel.
 *
 * The pod's title, start, club and city are copied in so the table can sort
 * and filter on them; the sync keeps them current while the post waits.
 */
const promoSchema = new Schema(
  {
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    pod_title: { type: String, default: '' },
    pod_start: { type: Date, required: true, index: true },
    club_id: { type: String, default: '', index: true },
    club_name: { type: String, default: '' },
    city_id: { type: String, default: '', index: true },
    city_name: { type: String, default: '' },
    pod_url: { type: String, default: '' },
    status: { type: String, enum: POD_PROMO_STATUSES, default: 'PLANNED', index: true },
    source: { type: String, enum: POD_PROMO_SOURCES, default: 'AUTO' },
    style: { type: String, enum: BANNER_STYLES, required: true },
    /** True when a person chose the style; a re-render then keeps it. */
    style_locked: { type: Boolean, default: false },
    banner_style: { type: String, enum: BANNER_SIZES, default: 'PORTRAIT' },
    slides: { type: [slideSchema], default: [] },
    collaborators: { type: [String], default: [] },
    caption: { type: String, default: '' },
    hashtags: { type: [String], default: [] },
    ai_caption: { type: Boolean, default: false },
    short_link_id: { type: Schema.Types.ObjectId, ref: 'ShortLink', default: null },
    short_code: { type: String, default: '' },
    tracking_url: { type: String, default: '' },
    utm_campaign: { type: String, default: '' },
    scheduled_post_id: { type: Schema.Types.ObjectId, ref: 'SocialScheduledPost', default: null, index: true },
    post_status: { type: String, default: '' },
    permalink: { type: String, default: '' },
    scheduled_at: { type: Date, default: null, index: true },
    published_at: { type: Date, default: null },
    /** Overrides a person gave on Schedule; empty means the settings decide. */
    account_ids: { type: [String], default: [] },
    error: { type: String, default: '' },
    attempts: { type: Number, default: 0 },
    /** Held while a tick or a person works on the row; a crashed worker's lock expires. */
    locked_until: { type: Date, default: null },
    run_id: { type: String, default: '' },
    figures: { type: figuresSchema, default: () => ({}) },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps }
);
promoSchema.index({ pod_id: 1 }, { unique: true });
// The sync reads every promotion still waiting or recently out.
promoSchema.index({ status: 1, pod_start: 1 });

export type PodPromoSettingsDoc = InferSchemaType<typeof settingsSchema> & { _id: Types.ObjectId };
export type PodPromoDoc = InferSchemaType<typeof promoSchema> & { _id: Types.ObjectId };

export const PodPromoSettingsModel = model('PodPromoSettings', settingsSchema, 'pod_promo_settings');
export const PodPromoModel = model('PodPromo', promoSchema, 'pod_promos');
