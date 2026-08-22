import { Schema, model, Types, type Document } from 'mongoose';
import { signatorySchema, type ISignatory } from '@modules/content/signing/signing.model';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

export interface ILegalDocumentVersion {
  _id: Types.ObjectId;
  name: string;
  document_type: string;
  description: string;
  content: string;
  updated_by: Types.ObjectId | null;
  created_at: Date;
}

const versionSchema = new Schema<ILegalDocumentVersion>(
  {
    name: { type: String, default: '' },
    document_type: { type: String, default: '' },
    description: { type: String, default: '' },
    content: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

/**
 * The signature block now lives in `@modules/content/signing`, because
 * contracts sign through exactly the same rules (rule 34). Re-exported here so
 * nothing that already imported it from this file has to move.
 */
export {
  SIGNATURE_METHODS,
  signatorySchema,
  type SignatureMethod,
  type ISignatory as ILegalDocumentSignatory,
} from '@modules/content/signing/signing.model';

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
  signatories: Types.DocumentArray<ISignatory>;
  /**
   * Set when the last outstanding signatory signs. Its presence IS the lock:
   * a signed contract that can still be edited is not a signed contract.
   */
  signed_at: Date | null;
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
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
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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
