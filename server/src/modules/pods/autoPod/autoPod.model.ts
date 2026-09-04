import { Schema, model, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/**
 * An Auto Pod is an admin-authored pod OFFER that the marketplace completes
 * itself: a venue accepts it (and picks the slot), a host assigns themselves,
 * and a club admin claims it for their club — in ANY order, each in parallel.
 * Only when all three have enrolled does it materialize into a real Pod.
 *
 * A VIRTUAL offer has no venue to enrol: the admin writes the meeting link and
 * the dates into the template, and a host plus a club admin complete it.
 *
 * The FIRST enrolment pins the offer to a location (Country → State → City, one
 * admin Location row): a venue brings its own city, a club its own, and a host
 * the city they had selected when they assigned themselves. From then on only
 * partners in that city are offered it, and a venue or club elsewhere is
 * refused — a pod cannot be hosted in one city and booked in another.
 *
 * It deliberately lives in its OWN collection rather than as a half-built Pod:
 * `pod(id)` and `podBySlugs` apply no stage filter, so an incomplete pod row
 * would be reachable by id, and `podService.create` requires a host, a club, a
 * venue and a future date that simply do not exist yet. Same reasoning as
 * PodDraft — a pre-pod record can never leak into a public feed.
 *
 * OPEN          — nobody has enrolled yet (visible to all three roles)
 * CLAIMING      — at least one partner enrolled; the rest enrol in parallel
 * MATERIALIZING — transient lock while the Pod is being created
 * LIVE          — materialized; `pod_id` points at an ordinary pod
 * CANCELLED     — admin pulled it before it went live
 * EXPIRED       — its accepted slot's date passed before it completed
 */
export type AutoPodStage =
  | 'OPEN'
  | 'CLAIMING'
  | 'MATERIALIZING'
  | 'LIVE'
  | 'CANCELLED'
  | 'EXPIRED';

export interface IAutoPodMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export interface IAutoPodPlaceCharge {
  label: string;
  amount: number;
  note: string | null;
}

/** A Duncit product the admin attached to the template — id + quantity only;
 * the pod's own rows (name, cost) are built when it materializes. */
export interface IAutoPodProductRequest {
  product_id: Types.ObjectId;
  quantity: number;
}

/**
 * PHYSICAL — a venue enrols and brings the slot (and so the date).
 * VIRTUAL — there is no venue: the admin writes the meeting details and the
 * dates into the template, and only a host and a club admin need enrol.
 */
export type AutoPodMode = 'PHYSICAL' | 'VIRTUAL';

/** Tick 1 — the venue that accepted, and the slot it committed. */
export interface IAutoPodVenueClaim {
  venue_id: Types.ObjectId;
  venue_slot_id: Types.ObjectId;
  owner_user_id: Types.ObjectId;
  venue_name: string;
  pod_date_time: Date;
  pod_end_date_time: Date | null;
  /** Snapshotted so the economics gate and the cards never re-read a slot
   * whose price could have moved. */
  slot_price: number;
  accepted_at: Date;
}

/** Tick 2 — the host who assigned themselves. */
export interface IAutoPodHostClaim {
  user_id: Types.ObjectId;
  host_name: string;
  assigned_at: Date;
}

/** Tick 3 — the club the Auto Pod was claimed for, and by whom. */
export interface IAutoPodClubClaim {
  club_id: Types.ObjectId;
  club_name: string;
  user_id: Types.ObjectId;
  claimed_at: Date;
}

/** Which enrolment pinned the location. */
export type AutoPodLocationBinder = 'VENUE' | 'HOST' | 'CLUB';

/**
 * The city the offer is pinned to, snapshotted from the admin Location row so
 * the cards never re-read a location that could since have been renamed.
 */
export interface IAutoPodLocation {
  location_id: Types.ObjectId;
  location_name: string;
  country: string;
  state: string;
  city: string;
  bound_by: AutoPodLocationBinder;
  bound_at: Date;
}

/**
 * ONE partner's own clock on this offer — what the card counts down as
 * "removed from your list in 23h 49m".
 *
 * It runs from the moment the offer first reached THEM rather than from the
 * offer's creation, so a partner shown a three-day-old Auto Pod still gets the
 * whole window to decide. It is never restarted: enrolling PAUSES it (the
 * offer is theirs, so it is not about to leave their list) by banking the time
 * spent into `consumed_ms`, and withdrawing resumes it from exactly what was
 * left. A venue that accepted at "20h 45m" and later cancels sees 20h 45m
 * again, not a fresh 24 hours.
 */
export interface IAutoPodViewerWindow {
  user_id: Types.ObjectId;
  /** When the running stretch began; null while the clock is paused. */
  started_at: Date | null;
  /** Time already spent across every earlier stretch. */
  consumed_ms: number;
}

export interface IAutoPodEvent {
  action: string;
  actor_user_id: Types.ObjectId | null;
  actor_name: string;
  note: string;
  at: Date;
}

export interface IAutoPod extends Document {
  auto_pod_no: string;
  stage: AutoPodStage;
  created_by: Types.ObjectId | null;
  /** False while an admin has paused the offer: shown to nobody, no claim lands. */
  is_active: boolean;
  /** When the offer was last put in front of venues — at creation, and again
   * whenever a venue withdraws its slot. The venue window counts from here;
   * rows from before the field count from created_at. */
  venue_window_from: Date | null;
  pod_title: string;
  pod_description: string;
  pod_info: string;
  pod_hashtag: string[];
  pod_images_and_videos: IAutoPodMedia[];
  reel_url: string | null;
  super_category_id: Types.ObjectId;
  sub_category_id: Types.ObjectId;
  pod_mode: AutoPodMode;
  /** VIRTUAL only — a physical offer's meeting fields stay null. */
  meeting_platform: string | null;
  meeting_url: string | null;
  meeting_notes: string | null;
  /** VIRTUAL only — a physical offer takes its dates from the venue's slot. */
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
  pod_type: 'PAID';
  pod_amount: number;
  no_of_spots: number;
  pod_occurrence: string;
  what_this_pod_offers: string[];
  available_perks: string[];
  payment_terms: string | null;
  place_charges: IAutoPodPlaceCharge[];
  products_enabled: boolean;
  product_requests: IAutoPodProductRequest[];
  venue_claim: IAutoPodVenueClaim | null;
  host_claim: IAutoPodHostClaim | null;
  club_claim: IAutoPodClubClaim | null;
  /** Null until the first enrolment pins it. */
  location: IAutoPodLocation | null;
  /** One row per partner who has seen this offer — their own countdown's start. */
  viewer_windows: IAutoPodViewerWindow[];
  pod_id: Types.ObjectId | null;
  materialized_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by: Types.ObjectId | null;
  cancel_reason: string;
  /** Append-only lifecycle trail. PodAuditLog needs a real pod, so an Auto Pod's
   * pre-pod history has nowhere else to live; the materialized pod still gets
   * its ordinary CREATE audit row. */
  events: IAutoPodEvent[];
  created_at: Date;
  updated_at: Date;
}

const mediaSchema = new Schema<IAutoPodMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
  },
  { _id: false }
);

const placeChargeSchema = new Schema<IAutoPodPlaceCharge>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0, max: 100000 },
    note: { type: String, default: null, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const productRequestSchema = new Schema<IAutoPodProductRequest>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
    quantity: { type: Number, required: true, min: 1, max: 10000 },
  },
  { _id: false }
);

const venueClaimSchema = new Schema<IAutoPodVenueClaim>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    venue_slot_id: { type: Schema.Types.ObjectId, ref: 'VenueSlot', required: true },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    venue_name: { type: String, default: '', trim: true },
    pod_date_time: { type: Date, required: true },
    pod_end_date_time: { type: Date, default: null },
    slot_price: { type: Number, default: 0, min: 0 },
    accepted_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const hostClaimSchema = new Schema<IAutoPodHostClaim>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    host_name: { type: String, default: '', trim: true },
    assigned_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const clubClaimSchema = new Schema<IAutoPodClubClaim>(
  {
    club_id: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    club_name: { type: String, default: '', trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    claimed_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const locationSchema = new Schema<IAutoPodLocation>(
  {
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    location_name: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    bound_by: { type: String, enum: ['VENUE', 'HOST', 'CLUB'], required: true },
    bound_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const viewerWindowSchema = new Schema<IAutoPodViewerWindow>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    started_at: { type: Date, default: () => new Date() },
    consumed_ms: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const eventSchema = new Schema<IAutoPodEvent>(
  {
    action: { type: String, required: true, trim: true, maxlength: 40 },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actor_name: { type: String, default: '', trim: true, maxlength: 120 },
    note: { type: String, default: '', trim: true, maxlength: 400 },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const autoPodSchema = new Schema<IAutoPod>(
  {
    auto_pod_no: { type: String, unique: true, index: true },
    stage: {
      type: String,
      enum: ['OPEN', 'CLAIMING', 'MATERIALIZING', 'LIVE', 'CANCELLED', 'EXPIRED'],
      default: 'OPEN',
      index: true,
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    is_active: { type: Boolean, default: true, index: true },
    venue_window_from: { type: Date, default: null },
    pod_title: { type: String, required: true, trim: true },
    pod_description: { type: String, required: true },
    pod_info: { type: String, default: '' },
    pod_hashtag: { type: [String], default: [] },
    pod_images_and_videos: { type: [mediaSchema], default: [] },
    reel_url: { type: String, default: null, trim: true, maxlength: 1000 },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    pod_mode: { type: String, enum: ['PHYSICAL', 'VIRTUAL'], default: 'PHYSICAL', index: true },
    meeting_platform: { type: String, default: null, trim: true, maxlength: 80 },
    meeting_url: { type: String, default: null, trim: true, maxlength: 1000 },
    meeting_notes: { type: String, default: null, trim: true, maxlength: 1000 },
    pod_date_time: { type: Date, default: null },
    pod_end_date_time: { type: Date, default: null },
    // An Auto Pod may never be FREE.
    pod_type: { type: String, enum: ['PAID'], default: 'PAID' },
    pod_amount: { type: Number, default: 0, min: 0, max: 1999 },
    no_of_spots: { type: Number, default: 0 },
    pod_occurrence: {
      type: String,
      enum: ['ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'ALTERNATE_DAY', 'WEEKENDS_ONLY'],
      default: 'ONE_TIME',
    },
    what_this_pod_offers: { type: [String], default: [] },
    available_perks: { type: [String], default: [] },
    payment_terms: { type: String, default: null, trim: true, maxlength: 4000 },
    place_charges: { type: [placeChargeSchema], default: [] },
    products_enabled: { type: Boolean, default: false },
    product_requests: { type: [productRequestSchema], default: [] },
    venue_claim: { type: venueClaimSchema, default: null },
    host_claim: { type: hostClaimSchema, default: null },
    club_claim: { type: clubClaimSchema, default: null },
    location: { type: locationSchema, default: null },
    viewer_windows: { type: [viewerWindowSchema], default: [] },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null },
    materialized_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    cancelled_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cancel_reason: { type: String, default: '', trim: true, maxlength: 400 },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

autoPodSchema.index({ stage: 1, created_at: -1 });
autoPodSchema.index({ 'venue_claim.owner_user_id': 1, stage: 1 });
autoPodSchema.index({ 'host_claim.user_id': 1 });
autoPodSchema.index({ 'club_claim.club_id': 1 });
autoPodSchema.index({ sub_category_id: 1, stage: 1 });
autoPodSchema.index({ 'location.location_id': 1, stage: 1 });
autoPodSchema.index({ 'viewer_windows.user_id': 1 });

autoPodSchema.pre('save', async function assignAutoPodNo(next) {
  if (!this.auto_pod_no) {
    this.auto_pod_no = await nextEntityNo('APOD', 'auto_pod');
  }
  next();
});

export const AutoPodModel = model<IAutoPod>('AutoPod', autoPodSchema);
