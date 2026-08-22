import { Schema, Types } from 'mongoose';

/**
 * The signature block shared by every signable record in the Legal console.
 *
 * ONE definition, imported by both `legalDocument` and `contract`, because the
 * two now sign identically and a second copy would drift on exactly the fields
 * that decide whether a signature is evidence — the method, the moment, and who
 * gave it (rule 34). The sub-schema is exported as a factory-free constant
 * because Mongoose is happy to reuse one sub-schema across parent schemas.
 */

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
export interface ISignatory {
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

export const signatorySchema = new Schema<ISignatory>(
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
