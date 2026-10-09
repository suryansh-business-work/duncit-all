import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * One file the media organizer found, and what it did with it.
 *
 * The scan writes these, the apply reads them, and they stay behind as the
 * record of every rewrite — which document, which field, the exact value
 * before and after — so any re-homed file can be traced, and put back.
 */

export const RELOCATION_STATUSES = [
  /** Found, owned by exactly one record, not yet in its folder. */
  'PENDING',
  /** Copied and every owner reference rewritten. */
  'DONE',
  /** Already in its owner's folder. */
  'IN_PLACE',
  /** Used by more than one owner — left where it is for all of them. */
  'SHARED',
  /** ImageKit refused the copy (usually: the file is already gone). Nothing was rewritten. */
  'FAILED',
  /** A DONE file whose references were pointed back at the original. */
  'ROLLED_BACK',
] as const;
export type RelocationStatus = (typeof RELOCATION_STATUSES)[number];

/** One field of one document that holds the file. */
export interface RelocationRef {
  model: string;
  doc_id: string;
  /** Dotted path, array indexes included — `media.2.url`. */
  path: string;
  /** The whole field value as scanned; the rewrite only lands while it is unchanged. */
  value: string;
  /** Set once rewritten, so a rollback writes back exactly what it replaced. */
  new_value: string;
  /** False when the field had changed since the scan — that document kept the original URL. */
  rewritten: boolean;
}

export interface MediaRelocationFields {
  run_id: string;
  /** URL-encoded path after the endpoint, as stored — `/pods/cover_x7.jpg`. */
  file_path: string;
  /** Every owner (`bucket/id`) referencing it; exactly one makes it movable. */
  owners: string[];
  /** Destination folder for the first owner seen, e.g. `/production/pods/66f1…/media`. */
  target_folder: string;
  new_file_path: string;
  refs: RelocationRef[];
  status: RelocationStatus;
  error: string;
  created_at: Date;
  updated_at: Date;
}

export type IMediaRelocation = MediaRelocationFields & Document;
export type LeanMediaRelocation = MediaRelocationFields & { _id: Types.ObjectId };

const refSchema = new Schema<RelocationRef>(
  {
    model: { type: String, required: true },
    doc_id: { type: String, required: true },
    path: { type: String, required: true },
    value: { type: String, default: '' },
    new_value: { type: String, default: '' },
    rewritten: { type: Boolean, default: false },
  },
  { _id: false }
);

const mediaRelocationSchema = new Schema<IMediaRelocation>(
  {
    run_id: { type: String, required: true },
    file_path: { type: String, required: true },
    owners: { type: [String], default: [] },
    target_folder: { type: String, default: '' },
    new_file_path: { type: String, default: '' },
    refs: { type: [refSchema], default: [] },
    status: { type: String, enum: RELOCATION_STATUSES, default: 'PENDING' },
    error: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'media_relocations' }
);

mediaRelocationSchema.index({ run_id: 1, file_path: 1 }, { unique: true });
mediaRelocationSchema.index({ run_id: 1, status: 1, _id: 1 });

export const MediaRelocationModel =
  (mongoose.models.MediaRelocation as mongoose.Model<IMediaRelocation>) ||
  mongoose.model<IMediaRelocation>('MediaRelocation', mediaRelocationSchema);
