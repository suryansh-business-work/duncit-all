import { Schema, model, Types, type Document } from 'mongoose';
import {
  bankAccountSchema,
  blankBankAccount,
  type IBankAccountVerification,
} from '@modules/finance/finance/bankAccount';

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

/** Operating hours, weekly-off, holidays + booking rules. Drives the Recurring
 * Availability generator (skip offs/holidays, clamp to hours) and validation. */
export interface IVenueSettings {
  operating_hours: IVenueOperatingHours;
  weekly_off_days: number[]; // 0..6 (Sun..Sat)
  holidays: string[]; // 'YYYY-MM-DD'
  rules: IVenueRules;
  auto_extend: IVenueAutoExtend;
}

export interface IVenue extends Document {
  owner_user_id: Types.ObjectId;
  // Step 1: Venue details
  venue_name: string;
  venue_type: string; // cafe, sports turf, banquet, etc.
  capacity: number;
  capacity_items: IVenueCapacityItem[];
  venue_category: IVenueCategory;
  description: string;
  amenities: string[];
  facilities: string[];
  security: string[];
  cover_image_url: string;
  gallery: string[];
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
  },
  { _id: false }
);

const venueSchema = new Schema<IVenue>(
  {
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    venue_name: { type: String, default: '' },
    venue_type: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    capacity_items: { type: [venueCapacityItemSchema], default: [] },
    venue_category: { type: venueCategorySchema, default: () => ({}) },
    description: { type: String, default: '' },
    amenities: { type: [String], default: [] },
    facilities: { type: [String], default: [] },
    security: { type: [String], default: [] },
    cover_image_url: { type: String, default: '' },
    gallery: { type: [String], default: [] },
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

export const VenueModel = model<IVenue>('Venue', venueSchema);
