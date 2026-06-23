import { Schema, model, Types, type Document } from 'mongoose';

export type EcommBrandStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface IEcommBrandDocument {
  type: string; // e.g. 'GST_CERT', 'TRADEMARK', 'BRAND_DECK', 'OWNER_ID'
  url: string;
  uploaded_at: Date;
}

export interface IEcommBrand extends Document {
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
  // Workflow
  status: EcommBrandStatus;
  is_active: boolean;
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

const ecommBrandSchema = new Schema<IEcommBrand>(
  {
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
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
    is_active: { type: Boolean, default: true },
    reviewer_notes: { type: String, default: '' },
    submitted_at: { type: Date, default: null },
    approved_at: { type: Date, default: null },
    rejected_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const EcommBrandModel = model<IEcommBrand>('EcommBrand', ecommBrandSchema);
