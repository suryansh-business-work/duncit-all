import { Schema, model, Types, type Document } from 'mongoose';

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

export interface ILegalDocument extends Document {
  name: string;
  document_type: string;
  description: string;
  content: string;
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
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    document_type: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    content: { type: String, default: '' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    created_by_name: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by_name: { type: String, default: '' },
    versions: { type: [versionSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

legalDocumentSchema.index({ document_type: 1, updated_at: -1 });

export const LegalDocumentModel = model<ILegalDocument>('LegalDocument', legalDocumentSchema);
