import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Reel Studio — a reel the AI portal builds by talking to it.
 *
 * A PROJECT is one reel: the Drive folder its footage comes from, the clips and
 * images picked out of it (plus whatever was uploaded in the chat), the
 * conversation that shaped it, and the SPEC — the edit itself, as data. The
 * portal renders the spec with Remotion; nothing here is a video file.
 *
 * An ASSET is a pointer, never a copy: Drive footage stays in Drive and is
 * streamed through a signed route, so a 300 MB clip is not uploaded a second
 * time just to be previewed. Only chat uploads have a URL of their own.
 *
 * The spec is stored as written by `sanitizeSpec` (see `reel.edit.ts`) and is
 * sanitized again on the way out, so a project saved before the contract grew
 * a field still reads as a valid reel.
 */

export const REEL_ASSET_KINDS = ['VIDEO', 'IMAGE', 'AUDIO'] as const;
export type ReelAssetKind = (typeof REEL_ASSET_KINDS)[number];

export const REEL_ASSET_SOURCES = ['DRIVE', 'UPLOAD'] as const;
export type ReelAssetSource = (typeof REEL_ASSET_SOURCES)[number];

export const REEL_MESSAGE_ROLES = ['USER', 'ASSISTANT'] as const;
export type ReelMessageRole = (typeof REEL_MESSAGE_ROLES)[number];

export interface ReelAsset {
  id: string;
  kind: ReelAssetKind;
  source: ReelAssetSource;
  name: string;
  mime_type: string;
  /** DRIVE only: the file the signed stream route reads. */
  drive_file_id: string;
  /** UPLOAD only: where the chat upload landed. */
  url: string;
  /** 0 when Drive has not finished reading the file's metadata. */
  duration_ms: number;
  width: number;
  height: number;
  size_bytes: number;
  added_at: Date;
}

export interface ReelMessage {
  id: string;
  role: ReelMessageRole;
  text: string;
  /** USER: the images attached to this message. */
  asset_ids: string[];
  /**
   * ASSISTANT: the edit this reply produced, so any earlier version can be put
   * back. Null on a reply that changed nothing, and on one that failed.
   */
  spec: unknown;
  failed: boolean;
  at: Date;
}

export interface ReelProjectFields {
  name: string;
  drive_url: string;
  drive_folder_id: string;
  assets: ReelAsset[];
  spec: unknown;
  messages: ReelMessage[];
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}
export type IReelProject = ReelProjectFields & Document;

const assetSchema = new Schema<ReelAsset>(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: REEL_ASSET_KINDS, required: true },
    source: { type: String, enum: REEL_ASSET_SOURCES, required: true },
    name: { type: String, default: '' },
    mime_type: { type: String, default: '' },
    drive_file_id: { type: String, default: '' },
    url: { type: String, default: '' },
    duration_ms: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    size_bytes: { type: Number, default: 0 },
    added_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new Schema<ReelMessage>(
  {
    id: { type: String, required: true },
    role: { type: String, enum: REEL_MESSAGE_ROLES, required: true },
    text: { type: String, default: '' },
    asset_ids: { type: [String], default: [] },
    spec: { type: Schema.Types.Mixed, default: null },
    failed: { type: Boolean, default: false },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new Schema<IReelProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    drive_url: { type: String, default: '', trim: true },
    drive_folder_id: { type: String, default: '', trim: true },
    assets: { type: [assetSchema], default: [] },
    spec: { type: Schema.Types.Mixed, default: null },
    messages: { type: [messageSchema], default: [] },
    created_by: { type: String, default: '' },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'reel_projects' }
);

projectSchema.index({ updated_at: -1 });

export const ReelProjectModel =
  mongoose.models.ReelProject ?? mongoose.model<IReelProject>('ReelProject', projectSchema);
