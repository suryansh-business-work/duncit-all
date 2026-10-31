import { VENUE_RENTAL_LIMITS, VENUE_RENTAL_UNITS, type IVenueRentalItem } from './venue.rentals';
import { Schema, model, Types, type Document } from 'mongoose';
import {
  bankAccountSchema,
  blankBankAccount,
  type IBankAccountVerification,
} from '@modules/finance/finance/bankAccount';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import { attachEntityAudit } from '@modules/platform/entityAudit/entityAudit.attach';
import {
  VENUE_FOOD_DIETS,
  VENUE_FOOD_DISCOUNT_MAX_PCT,
  VENUE_FOOD_GST_PCT_MAX,
  VENUE_FOOD_PRICE_MAX,
  VENUE_FOOD_SAVING_DISPLAYS,
  VENUE_FOOD_SPICE_LEVELS,
  VENUE_FOOD_TAX_DEFAULTS,
  VENUE_FOOD_TAX_MODES,
} from './venue.constants';
import { hasVenueCategory, pickVenueCategory, venueCategoryKey } from './venue.categories';
import { venuePricingSchema } from '@modules/venues/venuePricing/venuePricing.schema.model';
import type { VenuePricing } from '@modules/venues/venuePricing/venuePricing.types';
import type { IVenueOfferSettings } from './venue.offerSettings';

export type VenueFoodTaxMode = (typeof VENUE_FOOD_TAX_MODES)[number];

export type VenueStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface IVenueDocument {
  type: string; // e.g. 'GST_CERT', 'TRADE_LICENSE', 'OWNER_ID'
  url: string;
  uploaded_at: Date;
}

/** Category the venue wants to host pods in — Super → Category → Sub triple
 * off the shared pods Category collection, names denormalized for display
 * (same pattern as Host.host_categories). */
export interface IVenueCategory {
  super_category_id: Types.ObjectId | null;
  category_id: Types.ObjectId | null;
  sub_category_id: Types.ObjectId | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
}

/** One named capacity the venue offers (e.g. "Banquet hall" → 120,
 * "Rooftop tables" → 40). The scalar `capacity` stays the sum of these so
 * existing consumers (listings, admin review, booking) keep working. */
export interface IVenueCapacityItem {
  label: string;
  capacity: number;
}

export type VenueFoodDiet = (typeof VENUE_FOOD_DIETS)[number];
export type VenueFoodSpiceLevel = (typeof VENUE_FOOD_SPICE_LEVELS)[number];
export type VenueFoodSavingDisplay = (typeof VENUE_FOOD_SAVING_DISPLAYS)[number];

/** One dish on the venue's food menu. It keeps its `_id` across edits so an
 * order placed against it still points at the same dish. */
export interface IVenueFoodItem {
  _id: Types.ObjectId;
  name: string;
  description: string;
  /** The owner's own menu heading, e.g. "Starters". Blank lists under no heading. */
  category: string;
  /** Rupees, what the guest pays for one — taxes included. */
  price: number;
  images: string[];
  diet: VenueFoodDiet;
  spice_level: VenueFoodSpiceLevel;
  /** Off = shown as unavailable and refused at checkout, without deleting it. */
  is_available: boolean;
  /** Uploaded clips or YouTube links. Absent on a dish saved before videos existed. */
  videos?: string[];
  /**
   * The MRP shown struck through beside `price` — display only, never charged.
   * Null (or absent) = no strikethrough; when set it is always above `price`.
   */
  original_price?: number | null;
  /** How the saving against `original_price` reads: a percent or an amount. */
  saving_display?: VenueFoodSavingDisplay;
}

/** The licences a venue that serves food shows. The FSSAI number is printed on its public menu and invoices. */
export interface IVenueFoodLicences {
  fssai_number: string;
  fssai_document_url: string;
  liquor_licence_number: string;
  liquor_document_url: string;
}

/** Scan-and-order: guests pay the venue's OWN Razorpay account, so this money
 * never enters Duncit's payments, wallets or settlements. */
export interface IVenueFoodOrdering {
  enabled: boolean;
  /** The owner's saved Razorpay connection (PartnerIntegration) orders are charged on. */
  razorpay_integration_id: Types.ObjectId | null;
  /** Percent the venue takes off every QR order (0 = none). */
  discount_pct: number;
  /**
   * Off = the venue's orders follow Finance's food GST default. On = its own
   * tax_mode and gst_pct below. Absent on a venue saved before food GST existed,
   * which reads as off.
   */
  tax_override?: boolean;
  tax_mode?: VenueFoodTaxMode;
  gst_pct?: number;
}

/** Daily operating window in venue-local "HH:mm" (24h). */
export interface IVenueOperatingHours {
  open: string;
  close: string;
}

/** Booking rules a venue owner controls — consumed by recurring-slot creation
 * and (later) the booking flow. */
export interface IVenueRules {
  buffer_minutes: number; // gap enforced between adjacent slots
  min_notice_minutes: number; // earliest a slot can start from "now"
  max_advance_days: number; // furthest ahead a slot can be scheduled
  max_bookings_per_slot: number; // capacity per slot
  allow_instant_booking: boolean;
  allow_waitlist: boolean;
  booking_approval_required: boolean;
  allow_multiple_bookings: boolean;
}

/** Auto-extend: keep a rolling window of availability published automatically.
 * A daily job rolls the venue's default (or referenced) slot template forward
 * up to `horizon_days` ahead, until the optional `until` date. */
export interface IVenueAutoExtend {
  enabled: boolean;
  template_id: Types.ObjectId | null; // SlotTemplate to roll forward (null = owner's default)
  horizon_days: number; // keep slots published this many days ahead
  until: string; // optional 'YYYY-MM-DD' stop date ('' = open-ended)
}

/** Whether a cancellation charge is a share of the slot price or a flat sum. */
export type VenueCancellationChargeType = 'PERCENT' | 'AMOUNT';

/** One band of the venue's cancellation policy: cancelling anywhere INSIDE
 * `hours_before` hours of the slot start costs `value` (a percent of the slot
 * price, or a flat amount). The tightest matching band wins, so a booking
 * cancelled outside every band is free. */
export interface IVenueCancellationTier {
  hours_before: number;
  charge_type: VenueCancellationChargeType;
  value: number;
}

/** Six hours before the pod starts — the auto-cancel window every venue carries
 * until the Onboarding review gives it its own. Read by the sweep too, so a
 * venue created before the field existed uses the same number as a new one. */
export const DEFAULT_CANCELLATION_TRIGGER_HOURS = 6;

/** One band of the venue's auto-cancellation refund ladder: a pod cancelled
 * with MORE than `hours_before` hours still to run refunds `refund_pct` of the
 * attendee's ticket money. The WIDEST matching band wins, so more notice can
 * never refund less; a cancellation later than every band refunds nothing. */
export interface IVenueCancellationRefundTier {
  hours_before: number;
  refund_pct: number;
}

/** What the venue owner charges for a late cancellation — or whether they take
 * one at all. `reschedule_only` turns cancelling off entirely, which is why it
 * makes the bands moot rather than being one more band.
 *
 * `trigger_hours` + `refund_tiers` are this venue's side of the finance-negative
 * auto-cancel (Onboarding → Onboarded Venues → Review): how long before a pod
 * starts the sweep may still cancel a loss-making pod here, and what its
 * attendees get back. Per-venue on purpose — a venue that bills its slot on the
 * day cannot be held to the lead time of one that does not. */
export interface IVenueCancellationPolicy {
  reschedule_only: boolean;
  tiers: IVenueCancellationTier[];
  /** Hours before a pod starts within which a pod at this venue is auto-cancelled
   * while its finance stays negative against the venue's potential earnings. */
  trigger_hours: number;
  refund_tiers: IVenueCancellationRefundTier[];
}

/** Operating hours, weekly-off, holidays + booking rules. Drives the Recurring
 * Availability generator (skip offs/holidays, clamp to hours) and validation. */
export interface IVenueSettings {
  operating_hours: IVenueOperatingHours;
  weekly_off_days: number[]; // 0..6 (Sun..Sat)
  holidays: string[]; // 'YYYY-MM-DD'
  rules: IVenueRules;
  auto_extend: IVenueAutoExtend;
  cancellation: IVenueCancellationPolicy;
  /** Booking offers: the fewest guests and the hours to answer (0 = platform default). */
  offers: IVenueOfferSettings;
}

export interface IVenue extends Document {
  /** Permanent human id (VEN-000001) shown in the Onboarded Venues table. */
  venue_no: string | null;
  owner_user_id: Types.ObjectId;
  // Step 1: Venue details
  venue_name: string;
  venue_type: string; // cafe, sports turf, banquet, etc.
  capacity: number;
  capacity_items: IVenueCapacityItem[];
  offers_food: boolean;
  food_menu: IVenueFoodItem[];
  food_ordering: IVenueFoodOrdering;
  /** Absent on a venue saved before food licences existed. */
  food_licences?: IVenueFoodLicences;
  /** The cafe's table labels, one per-table QR sticker each ("1", "Patio 2"). */
  food_tables?: string[];
  /** The venue rents items out to pod guests (venue.rentals.ts). */
  offers_rentals?: boolean;
  rental_items?: IVenueRentalItem[];
  /** The venue's own rental terms (rich-text HTML), shown with Duncit's. */
  rental_terms_html?: string;
  /** Whether a refundable deposit is taxed with the rent — the Venues console decides. */
  rental_deposit_gst?: boolean;
  /** Every category the venue belongs to, primary first. Read it through
   * `venueCategoriesOf` — a document older than the list has only the mirror. */
  venue_categories: IVenueCategory[];
  /** Always the mirror of `venue_categories[0]` (kept for released apps). */
  venue_category: IVenueCategory;
  description: string;
  amenities: string[];
  facilities: string[];
  security: string[];
  cover_image_url: string;
  gallery: string[];
  /** Venue videos: uploaded clips or YouTube links. Absent on a venue saved before videos existed. */
  videos?: string[];
  location_id?: Types.ObjectId | null;
  country: string;
  country_code: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  state_code: string;
  locality: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  // Step 2: Documentation
  documents: IVenueDocument[];
  gstin: string;
  pan: string;
  bank_account: IBankAccountVerification;
  // Step 3: Owner details
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_dob: Date | null;
  owner_address: string;
  tags: string[];
  // Venue deduction overrides (two %s for "Default Deductions"): venue_share_pct
  // = the venue's slice (used for revenue-share venues / planning), and
  // venue_commission_pct = the commission Duncit takes from the venue's payout,
  // applied after GST on a completed pod's venue bill. Set on the venue review
  // page; 0 on either falls back to the global default_venue_* at settlement.
  venue_share_pct: number;
  venue_commission_pct: number;
  // Venue Settings (operating hours, weekly-off, holidays) + booking rules.
  settings: IVenueSettings;
  /** The venue's own pricing (Venue Pricing Module); `model: null` = not set up, not bookable. */
  pricing: VenuePricing;
  /** Admin-set cap on monthly host Pod Requests; null = the default of 10. */
  host_requests_limit_override: number | null;
  // Workflow
  step_completed: number; // 0..4
  status: VenueStatus;
  is_active: boolean;
  reviewer_notes: string;
  submitted_at: Date | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const venueDocumentSchema = new Schema<IVenueDocument>(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
    uploaded_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const venueCategorySchema = new Schema<IVenueCategory>(
  {
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    super_category_name: { type: String, default: '' },
    category_name: { type: String, default: '' },
    sub_category_name: { type: String, default: '' },
  },
  { _id: false }
);

const venueCapacityItemSchema = new Schema<IVenueCapacityItem>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    capacity: { type: Number, required: true, min: 1, max: 100_000 },
  },
  { _id: false }
);

const venueFoodItemSchema = new Schema<IVenueFoodItem>({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  category: { type: String, default: '', trim: true, maxlength: 40 },
  price: { type: Number, required: true, min: 1, max: VENUE_FOOD_PRICE_MAX },
  images: { type: [String], default: [] },
  diet: { type: String, enum: VENUE_FOOD_DIETS, default: 'VEG' },
  spice_level: { type: String, enum: VENUE_FOOD_SPICE_LEVELS, default: 'NONE' },
  is_available: { type: Boolean, default: true },
  videos: { type: [String], default: [] },
  original_price: { type: Number, default: null, min: 1, max: VENUE_FOOD_PRICE_MAX },
  saving_display: { type: String, enum: VENUE_FOOD_SAVING_DISPLAYS, default: 'PERCENT' },
});

const venueRentalItemSchema = new Schema<IVenueRentalItem>({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  images: { type: [String], default: [] },
  unit: { type: String, enum: VENUE_RENTAL_UNITS, default: 'SLOT' },
  rate: { type: Number, required: true, min: 1, max: VENUE_RENTAL_LIMITS.rateMax },
  deposit: { type: Number, default: 0, min: 0, max: VENUE_RENTAL_LIMITS.depositMax },
  stock: { type: Number, required: true, min: 1, max: VENUE_RENTAL_LIMITS.stockMax },
  per_guest_limit: { type: Number, default: 1, min: 1, max: VENUE_RENTAL_LIMITS.perGuestMax },
  is_available: { type: Boolean, default: true },
  categories: { type: [venueCategorySchema], default: [] },
});

const venueFoodLicencesSchema = new Schema<IVenueFoodLicences>(
  {
    fssai_number: { type: String, default: '', trim: true },
    fssai_document_url: { type: String, default: '', trim: true },
    liquor_licence_number: { type: String, default: '', trim: true },
    liquor_document_url: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const venueFoodOrderingSchema = new Schema<IVenueFoodOrdering>(
  {
    enabled: { type: Boolean, default: false },
    razorpay_integration_id: { type: Schema.Types.ObjectId, ref: 'PartnerIntegration', default: null },
    discount_pct: { type: Number, default: 0, min: 0, max: VENUE_FOOD_DISCOUNT_MAX_PCT },
    tax_override: { type: Boolean, default: false },
    tax_mode: { type: String, enum: VENUE_FOOD_TAX_MODES, default: VENUE_FOOD_TAX_DEFAULTS.tax_mode },
    gst_pct: { type: Number, default: VENUE_FOOD_TAX_DEFAULTS.gst_pct, min: 0, max: VENUE_FOOD_GST_PCT_MAX },
  },
  { _id: false }
);

const venueRulesSchema = new Schema<IVenueRules>(
  {
    buffer_minutes: { type: Number, default: 0, min: 0, max: 1440 },
    min_notice_minutes: { type: Number, default: 0, min: 0, max: 525_600 },
    max_advance_days: { type: Number, default: 60, min: 1, max: 60 },
    max_bookings_per_slot: { type: Number, default: 1, min: 1, max: 100_000 },
    allow_instant_booking: { type: Boolean, default: true },
    allow_waitlist: { type: Boolean, default: false },
    booking_approval_required: { type: Boolean, default: false },
    allow_multiple_bookings: { type: Boolean, default: false },
  },
  { _id: false }
);

const venueAutoExtendSchema = new Schema<IVenueAutoExtend>(
  {
    enabled: { type: Boolean, default: false },
    template_id: { type: Schema.Types.ObjectId, ref: 'SlotTemplate', default: null },
    horizon_days: { type: Number, default: 30, min: 1, max: 365 },
    until: { type: String, default: '' },
  },
  { _id: false }
);

const venueCancellationTierSchema = new Schema<IVenueCancellationTier>(
  {
    hours_before: { type: Number, required: true, min: 0, max: 8760 },
    charge_type: { type: String, enum: ['PERCENT', 'AMOUNT'], default: 'PERCENT' },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const venueCancellationRefundTierSchema = new Schema<IVenueCancellationRefundTier>(
  {
    hours_before: { type: Number, required: true, min: 0, max: 8760 },
    refund_pct: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const venueCancellationSchema = new Schema<IVenueCancellationPolicy>(
  {
    reschedule_only: { type: Boolean, default: false },
    tiers: { type: [venueCancellationTierSchema], default: [] },
    // Six hours: the default the Onboarding review seeds every venue with.
    trigger_hours: { type: Number, default: 6, min: 0, max: 8760 },
    refund_tiers: { type: [venueCancellationRefundTierSchema], default: [] },
  },
  { _id: false }
);

const venueOfferSettingsSchema = new Schema<IVenueOfferSettings>(
  {
    // 0 = the platform default (Admin settings); see venue.offerSettings.
    min_guests: { type: Number, default: 0, min: 0, max: 1000 },
    response_hours: { type: Number, default: 0, min: 0, max: 720 },
    // The least the venue takes per booking, one per pricing basis — Create Pod refuses an offer below it.
    min_business: {
      type: [new Schema({ model: { type: String, required: true }, amount: { type: Number, required: true, min: 0 } }, { _id: false })],
      default: [],
    },
  },
  { _id: false }
);

const venueSettingsSchema = new Schema<IVenueSettings>(
  {
    operating_hours: {
      type: new Schema<IVenueOperatingHours>(
        {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '23:00' },
        },
        { _id: false }
      ),
      default: () => ({ open: '09:00', close: '23:00' }),
    },
    weekly_off_days: { type: [Number], default: [] },
    holidays: { type: [String], default: [] },
    rules: { type: venueRulesSchema, default: () => ({}) },
    auto_extend: { type: venueAutoExtendSchema, default: () => ({}) },
    cancellation: { type: venueCancellationSchema, default: () => ({}) },
    offers: { type: venueOfferSettingsSchema, default: () => ({}) },
  },
  { _id: false }
);

const venueSchema = new Schema<IVenue>(
  {
    venue_no: { type: String, default: null, index: true },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    venue_name: { type: String, default: '' },
    venue_type: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    capacity_items: { type: [venueCapacityItemSchema], default: [] },
    offers_food: { type: Boolean, default: false },
    food_menu: { type: [venueFoodItemSchema], default: [] },
    food_ordering: { type: venueFoodOrderingSchema, default: () => ({}) },
    food_licences: { type: venueFoodLicencesSchema, default: () => ({}) },
    food_tables: { type: [String], default: [] },
    offers_rentals: { type: Boolean, default: false },
    rental_items: { type: [venueRentalItemSchema], default: [] },
    rental_terms_html: { type: String, default: '', maxlength: 20_000 },
    rental_deposit_gst: { type: Boolean, default: true },
    venue_categories: { type: [venueCategorySchema], default: [] },
    venue_category: { type: venueCategorySchema, default: () => ({}) },
    description: { type: String, default: '' },
    amenities: { type: [String], default: [] },
    facilities: { type: [String], default: [] },
    security: { type: [String], default: [] },
    cover_image_url: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
    country: { type: String, default: 'India', trim: true },
    country_code: { type: String, default: 'IN', uppercase: true, trim: true },
    address_line1: { type: String, default: '' },
    address_line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    state_code: { type: String, default: '', uppercase: true, trim: true },
    locality: { type: String, default: '' },
    postal_code: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    documents: { type: [venueDocumentSchema], default: [] },
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    bank_account: { type: bankAccountSchema, default: blankBankAccount },
    owner_name: { type: String, default: '' },
    owner_email: { type: String, default: '' },
    owner_phone: { type: String, default: '' },
    owner_dob: { type: Date, default: null },
    owner_address: { type: String, default: '' },
    tags: { type: [String], default: [] },
    venue_share_pct: { type: Number, default: 0, min: 0, max: 100 },
    venue_commission_pct: { type: Number, default: 0, min: 0, max: 100 },
    settings: { type: venueSettingsSchema, default: () => ({}) },
    pricing: { type: venuePricingSchema, default: () => ({}) },
    host_requests_limit_override: { type: Number, default: null, min: 0 },
    step_completed: { type: Number, default: 0, min: 0, max: 4 },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
    is_active: { type: Boolean, default: true },
    reviewer_notes: { type: String, default: '' },
    submitted_at: { type: Date, default: null },
    approved_at: { type: Date, default: null },
    rejected_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Venue matching by any of the venue's category rows (club auto-match, public
// filters) and by sub category alone (the Auto Pod audience).
venueSchema.index({
  'venue_categories.super_category_id': 1,
  'venue_categories.category_id': 1,
  'venue_categories.sub_category_id': 1,
});
venueSchema.index({ 'venue_categories.sub_category_id': 1 });

// The list and its legacy mirror may never disagree in a stored document, so
// the rule lives here rather than in each writer. A write that set only the
// legacy triple (an older code path, or a document saved before the list
// existed) becomes a one-entry list; otherwise the list is the truth and its
// first entry is mirrored — only when it actually differs, so an unrelated
// save does not mark the category as changed.
venueSchema.pre('validate', function mirrorVenueCategories(this: IVenue) {
  // A document loaded with a projection cannot tell "no list" from "list not
  // loaded", so categories are never rewritten from half the picture.
  if (!this.isDirectSelected('venue_categories') || !this.isDirectSelected('venue_category')) return;
  const list = this.venue_categories;
  const legacyOnly = this.isModified('venue_category') && !this.isModified('venue_categories');
  if (hasVenueCategory(this.venue_category) && (list.length === 0 || legacyOnly)) {
    this.venue_categories = [pickVenueCategory(this.venue_category)];
  } else if (list.length > 0 && venueCategoryKey(list[0]) !== venueCategoryKey(this.venue_category)) {
    this.venue_category = pickVenueCategory(list[0]);
  }
});

// Assign a permanent human id on creation (unique, sequential) — surfaced in the
// Onboarded Venues table for tracking / search / reporting.
venueSchema.pre('save', async function assignVenueNo(this: IVenue) {
  if (this.isNew && !this.venue_no) this.venue_no = await nextEntityNo('VEN', 'venue');
});

// Every write through mongoose is diffed and appended to the entity change
// log (rule: the trail is captured at the model, never per service).
attachEntityAudit(venueSchema, 'VENUE');

export const VenueModel = model<IVenue>('Venue', venueSchema);
