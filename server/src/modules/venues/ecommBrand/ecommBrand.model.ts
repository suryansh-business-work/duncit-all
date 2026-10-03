import { Schema, model, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import { attachEntityAudit } from '@modules/platform/entityAudit/entityAudit.attach';
import { isBrandLive } from './ecommBrand.completion';

export type EcommBrandStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface IEcommBrandDocument {
  type: string; // e.g. 'GST_CERT', 'TRADEMARK', 'BRAND_DECK', 'OWNER_ID'
  url: string;
  uploaded_at: Date;
}

/**
 * One vendor account the brand holds. The credential is the brand's own —
 * never the Tech portal's — and is checked against the vendor with the same
 * probe the Tech portal runs on its entries. `connected` is what the last
 * check said; an approved brand goes live in the pod shop only once both are.
 */
export interface IBrandShiprocketIntegration {
  email: string;
  password: string;
  pickup_location: string;
  webhook_secret: string;
  connected: boolean;
  checked_at: Date | null;
  message: string;
  details: string[];
}

/**
 * Who carries a brand's parcels. A brand either ships on its OWN ShipRocket
 * account (connected in the wizard), or hands its parcels to DUNCIT's courier
 * service — the ShipRocket account the Tech portal maps to the Partners
 * console. Never the pet store's account: the two businesses do not share one.
 */
export const BRAND_SHIPPING_MODES = ['OWN_SHIPROCKET', 'DUNCIT_COURIER'] as const;
export type BrandShippingMode = (typeof BRAND_SHIPPING_MODES)[number];

export interface IBrandRazorpayIntegration {
  key_id: string;
  key_secret: string;
  webhook_secret: string;
  connected: boolean;
  checked_at: Date | null;
  message: string;
  details: string[];
}

/** The Brand Consent as the owner signed it — the wording hash is the record. */
export interface IBrandConsent {
  accepted: boolean;
  policy_id: Types.ObjectId | null;
  policy_slug: string;
  policy_title: string;
  content_hash: string;
  signed_name: string;
  signed_at: Date | null;
}

export interface IEcommBrand extends Document {
  /** Permanent human id (BRD-000001) shown in the Onboarded Brands table. */
  brand_no: string | null;
  owner_user_id: Types.ObjectId;
  // Brand identity
  brand_name: string;
  logo_url: string;
  cover_image_url: string;
  tagline: string;
  description: string;
  product_categories: string[];
  website_url: string;
  instagram_url: string;
  // Contact
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  // Duncit commission % override applied to ALL this brand's product sales
  // (0 = inherit: per-product pct, then the global default). Set from the
  // Onboarding console (Onboarded E-Commerce Brands).
  product_commission_pct: number;
  // Legal / business
  registered_business_name: string;
  gstin: string;
  pan: string;
  established_year: number | null;
  // Address
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  // Payout
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  // Verification
  documents: IEcommBrandDocument[];
  tags: string[];
  // E-commerce: default ShipRocket pickup/warehouse for this brand's SHIP orders.
  default_pickup_location_id: Types.ObjectId | null;
  // Who ships this brand's parcels; null on a brand that has not chosen yet.
  shipping_mode: BrandShippingMode | null;
  // The brand's own ShipRocket + Razorpay accounts (the wizard's last step).
  integrations: {
    shiprocket: IBrandShiprocketIntegration;
    razorpay: IBrandRazorpayIntegration;
  };
  // The Brand Consent signature.
  consent: IBrandConsent;
  // Workflow
  status: EcommBrandStatus;
  is_active: boolean;
  /** Derived on every save (`isBrandLive`): approved, active and integrations
   * ready. The pod shop, checkout and storefront list only live brands. */
  live: boolean;
  /** When the brand last went live; null while it is not. */
  live_since: Date | null;
  /** Stamped once by the startup backfill on a brand that was already selling
   * before integrations were required to go live — it stays live without them. */
  integration_waived: boolean;
  reviewer_notes: string;
  submitted_at: Date | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const brandDocumentSchema = new Schema<IEcommBrandDocument>(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
    uploaded_at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const probeFields = {
  connected: { type: Boolean, default: false },
  checked_at: { type: Date, default: null },
  message: { type: String, default: '' },
  details: { type: [String], default: [] },
};

const shiprocketIntegrationSchema = new Schema<IBrandShiprocketIntegration>(
  {
    email: { type: String, default: '', trim: true },
    password: { type: String, default: '' },
    pickup_location: { type: String, default: '', trim: true },
    webhook_secret: { type: String, default: '', trim: true },
    ...probeFields,
  },
  { _id: false }
);

const razorpayIntegrationSchema = new Schema<IBrandRazorpayIntegration>(
  {
    key_id: { type: String, default: '', trim: true },
    key_secret: { type: String, default: '' },
    webhook_secret: { type: String, default: '', trim: true },
    ...probeFields,
  },
  { _id: false }
);

const brandConsentSchema = new Schema<IBrandConsent>(
  {
    accepted: { type: Boolean, default: false },
    policy_id: { type: Schema.Types.ObjectId, ref: 'Policy', default: null },
    policy_slug: { type: String, default: '' },
    policy_title: { type: String, default: '' },
    content_hash: { type: String, default: '' },
    signed_name: { type: String, default: '', trim: true },
    signed_at: { type: Date, default: null },
  },
  { _id: false }
);

const ecommBrandSchema = new Schema<IEcommBrand>(
  {
    brand_no: { type: String, default: null, index: true },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brand_name: { type: String, default: '' },
    logo_url: { type: String, default: '' },
    cover_image_url: { type: String, default: '' },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    product_categories: { type: [String], default: [] },
    website_url: { type: String, default: '' },
    instagram_url: { type: String, default: '' },
    contact_person: { type: String, default: '' },
    contact_email: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    product_commission_pct: { type: Number, default: 0, min: 0, max: 100 },
    registered_business_name: { type: String, default: '' },
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    established_year: { type: Number, default: null },
    address_line1: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postal_code: { type: String, default: '' },
    country: { type: String, default: 'India', trim: true },
    account_holder_name: { type: String, default: '' },
    account_number: { type: String, default: '' },
    ifsc_code: { type: String, default: '' },
    upi_id: { type: String, default: '' },
    documents: { type: [brandDocumentSchema], default: [] },
    tags: { type: [String], default: [] },
    default_pickup_location_id: { type: Schema.Types.ObjectId, ref: 'BrandPickupLocation', default: null },
    shipping_mode: { type: String, enum: [...BRAND_SHIPPING_MODES, null], default: null },
    integrations: {
      shiprocket: { type: shiprocketIntegrationSchema, default: () => ({}) },
      razorpay: { type: razorpayIntegrationSchema, default: () => ({}) },
    },
    consent: { type: brandConsentSchema, default: () => ({}) },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
    is_active: { type: Boolean, default: true },
    live: { type: Boolean, default: false, index: true },
    live_since: { type: Date, default: null },
    integration_waived: { type: Boolean, default: false },
    reviewer_notes: { type: String, default: '' },
    submitted_at: { type: Date, default: null },
    approved_at: { type: Date, default: null },
    rejected_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Assign a permanent human id on creation (unique, sequential) — surfaced in the
// Onboarded Brands table for tracking / search / reporting.
ecommBrandSchema.pre('save', async function assignBrandNo(this: IEcommBrand) {
  if (this.isNew && !this.brand_no) this.brand_no = await nextEntityNo('BRD', 'brand');
});

// `live` is never written by hand: every save re-derives it, so approving,
// pausing, rejecting, connecting or disconnecting an integration all move the
// brand on or off the pod shop through this one rule.
ecommBrandSchema.pre('save', function deriveLive(this: IEcommBrand) {
  const live = isBrandLive(this);
  if (live && !this.live) this.live_since = new Date();
  if (!live) this.live_since = null;
  this.live = live;
});

// Every write through mongoose is diffed into the entity change log — the
// brand's Logs tab in Partners and the Products portal (no secrets tracked).
attachEntityAudit(ecommBrandSchema, 'BRAND');

export const EcommBrandModel = model<IEcommBrand>('EcommBrand', ecommBrandSchema);
