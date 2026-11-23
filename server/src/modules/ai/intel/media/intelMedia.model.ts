import { Schema, model, type Types } from 'mongoose';
import { MEDIA_VISIBILITY, type MediaVisibility } from '../intel.constants';

/**
 * A file in the Media Manager. The bytes live in the `intel_media` GridFS
 * bucket — in the database, so they are private (never a public CDN URL) and
 * covered by the existing database backups. `folder` is a plain path string;
 * folders exist because files are in them, plus the empty ones saved here.
 */

export type MediaIndexStatus = 'PENDING' | 'INDEXING' | 'INDEXED' | 'FAILED' | 'SKIPPED';

export interface IIntelMedia {
  _id: Types.ObjectId;
  owner_id: Types.ObjectId;
  name: string;
  folder: string;
  mime: string;
  size: number;
  file_id: Types.ObjectId;
  sha256: string;
  visibility: MediaVisibility;
  favorite: boolean;
  archived: boolean;
  deleted_at: Date | null;
  index_status: MediaIndexStatus;
  index_method: string;
  index_warning: string;
  page_count: number;
  chunk_count: number;
  indexed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const intelMediaSchema = new Schema<IIntelMedia>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    folder: { type: String, default: '/', index: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    file_id: { type: Schema.Types.ObjectId, required: true },
    sha256: { type: String, required: true, index: true },
    visibility: { type: String, enum: MEDIA_VISIBILITY, default: 'PRIVATE' },
    favorite: { type: Boolean, default: false },
    archived: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date, default: null, index: true },
    index_status: { type: String, enum: ['PENDING', 'INDEXING', 'INDEXED', 'FAILED', 'SKIPPED'], default: 'PENDING', index: true },
    index_method: { type: String, default: '' },
    index_warning: { type: String, default: '' },
    page_count: { type: Number, default: 0 },
    chunk_count: { type: Number, default: 0 },
    indexed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

intelMediaSchema.index({ name: 'text' });

export const IntelMediaModel = model<IIntelMedia>('IntelMedia', intelMediaSchema, 'intel_media');

/** Empty folders a person created (folders with files need no row). */
const intelFolderSchema = new Schema(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    path: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
intelFolderSchema.index({ owner_id: 1, path: 1 }, { unique: true });

export const IntelFolderModel = model('IntelFolder', intelFolderSchema, 'intel_media_folders');
