import { Schema, model, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

export interface ILegalDocumentVersion {
  _id: Types.ObjectId;
  name: string;
  document_type: string;
  description: string;
  content: string;
  updated_by: Types.ObjectId | null;
  updated_by_name: string;
  created_at: Date;
}

const versionSchema = new Schema<ILegalDocumentVersion>(
  {
    name: { type: String, default: '' },
    document_type: { type: String, default: '' },
    description: { type: String, default: '' },
    content: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by_name: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

/** How a signature was captured. The portal offers whichever ones are enabled. */
export type SignatureMethod = 'DRAW' | 'TYPE' | 'UPLOAD';
export const SIGNATURE_METHODS: SignatureMethod[] = ['DRAW', 'TYPE', 'UPLOAD'];

/**
 * One person who must sign, and their signature once they have.
 *
 * An ARRAY from the first commit even though one admin signs today: "all
 * required signatories have signed" is the rule the lock hangs off, and a
 * single stored signature would have to be torn out to add a counter-party.
 * A row with no `signed_at` is somebody still owed.
 */
export interface ILegalDocumentSignatory {
  _id: Types.ObjectId;
  user_id: Types.ObjectId | null;
  full_name: string;
  designation: string;
  email: string;
  initials: string;
  /** The signature itself — a data URL (drawn/typed) or an uploaded image URL. */
  signature_image: string;
  signature_method: SignatureMethod | null;
  signed_at: Date | null;
  created_at: Date;
}

const signatorySchema = new Schema<ILegalDocumentSignatory>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    full_name: { type: String, default: '', trim: true, maxlength: 160 },
    designation: { type: String, default: '', trim: true, maxlength: 160 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    initials: { type: String, default: '', trim: true, maxlength: 12 },
    signature_image: { type: String, default: '' },
    signature_method: { type: String, enum: [...SIGNATURE_METHODS, null], default: null },
    signed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export interface ILegalDocument extends Document {
  /**
   * The permanent handle: DOC-000001. Minted on insert, never edited, and
   * never reused — the counter behind it only counts up, so a deleted
   * document does not hand its id to the next one.
   */
  document_no: string | null;
  name: string;
  document_type: string;
  description: string;
  content: string;
  /** Off hides the document from the app without deleting it. */
  is_active: boolean;
  /** Everyone who must sign. Empty means nobody has been asked yet. */
  signatories: Types.DocumentArray<ILegalDocumentSignatory>;
  /**
   * Set when the last outstanding signatory signs. Its presence IS the lock:
   * a signed contract that can still be edited is not a signed contract.
   */
  signed_at: Date | null;
  created_by: Types.ObjectId | null;
  created_by_name: string;
  updated_by: Types.ObjectId | null;
  updated_by_name: string;
  versions: Types.DocumentArray<ILegalDocumentVersion>;
  created_at: Date;
  updated_at: Date;
}

const legalDocumentSchema = new Schema<ILegalDocument>(
  {
    document_no: { type: String, default: null, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    is_active: { type: Boolean, default: true, index: true },
    document_type: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    content: { type: String, default: '' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    created_by_name: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by_name: { type: String, default: '' },
    versions: { type: [versionSchema], default: [] },
    signatories: { type: [signatorySchema], default: [] },
    signed_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

legalDocumentSchema.index({ document_type: 1, updated_at: -1 });

// Minted on insert only, so an id never changes once anyone has seen it.
legalDocumentSchema.pre('save', async function (next) {
  if (this.isNew && !this.document_no) {
    this.document_no = await nextEntityNo('DOC', 'legal_document');
  }
  next();
});

export const LegalDocumentModel = model<ILegalDocument>('LegalDocument', legalDocumentSchema);
