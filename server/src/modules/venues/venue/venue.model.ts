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

export interface IVenue extends Document {
  owner_user_id: Types.ObjectId;
  // Step 1: Venue details
  venue_name: string;
  venue_type: string; // cafe, sports turf, banquet, etc.
  capacity: number;
  description: string;
  amenities: string[];
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

const venueSchema = new Schema<IVenue>(
  {
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    venue_name: { type: String, default: '' },
    venue_type: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    description: { type: String, default: '' },
    amenities: { type: [String], default: [] },
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
