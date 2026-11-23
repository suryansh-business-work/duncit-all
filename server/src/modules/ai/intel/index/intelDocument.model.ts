import { Schema, model, type Types } from 'mongoose';
import { INDEX_SCOPES, INTEL_SOURCES, MEDIA_VISIBILITY, type IndexScope, type IntelSource, type MediaVisibility } from '../intel.constants';

/**
 * The registry of everything indexed: one row per source document (a file, a
 * code file, a Slack thread, an email thread, an issue…). It is what makes a
 * sync incremental (unchanged `content_hash` = skip), versioned (`version`
 * goes up on each real change) and deletable (a row's chunks are found in
 * Qdrant by `key`). The text itself lives only in Qdrant payloads.
 */

export type DocumentStatus = 'INDEXED' | 'FAILED' | 'DELETED';

export interface IIntelDocument {
  _id: Types.ObjectId;
  /** `<source>:<connector or owner id>:<external id>` — unique. */
  key: string;
  source: IntelSource;
  connector_id: string;
  external_id: string;
  scope: IndexScope;
  title: string;
  url: string;
  content_hash: string;
  version: number;
  chunk_count: number;
  char_count: number;
  status: DocumentStatus;
  error: string;
  owner_id: string;
  visibility: MediaVisibility;
  metadata: Record<string, unknown>;
  source_updated_at: Date | null;
  indexed_at: Date | null;
  /** Set by a full sync on every document it saw; anything older was deleted upstream. */
  seen_run: string;
  created_at: Date;
  updated_at: Date;
}

const intelDocumentSchema = new Schema<IIntelDocument>(
  {
    key: { type: String, required: true, unique: true },
    source: { type: String, enum: INTEL_SOURCES, required: true, index: true },
    connector_id: { type: String, required: true, index: true },
    external_id: { type: String, required: true },
    scope: { type: String, enum: INDEX_SCOPES, required: true, index: true },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    content_hash: { type: String, default: '' },
    version: { type: Number, default: 0 },
    chunk_count: { type: Number, default: 0 },
    char_count: { type: Number, default: 0 },
    status: { type: String, enum: ['INDEXED', 'FAILED', 'DELETED'], default: 'INDEXED', index: true },
    error: { type: String, default: '' },
    owner_id: { type: String, default: '' },
    visibility: { type: String, enum: MEDIA_VISIBILITY, default: 'TEAM' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    source_updated_at: { type: Date, default: null },
    indexed_at: { type: Date, default: null },
    seen_run: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

intelDocumentSchema.index({ connector_id: 1, status: 1, seen_run: 1 });
intelDocumentSchema.index({ title: 'text' });

export const IntelDocumentModel = model<IIntelDocument>('IntelDocument', intelDocumentSchema, 'intel_documents');
