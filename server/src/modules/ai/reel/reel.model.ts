import mongoose, { Schema, type Document } from 'mongoose';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@modules/crm/marketing/social/social.types';

/**
 * Reel Studio — a reel the Marketing console builds by talking to it.
 *
 * A PROJECT is one reel: the Drive folder its footage comes from, the clips and
 * images picked out of it (plus whatever was uploaded in the chat, searched
 * from the stock library, or made here — a voiceover), the conversation that
 * shaped it, and the SPEC — the edit itself, as data. The portal renders the
 * spec with Remotion; nothing here is a video file.
 *
 * An ASSET is a pointer, never a copy: Drive footage stays in Drive and is
 * streamed through a signed route, so a 300 MB clip is not uploaded a second
 * time just to be previewed. Stock footage stays on the library's CDN with its
 * licence line; only chat uploads and generated sound have a URL of our own.
 *
 * The spec is stored as written by `sanitizeSpec` (see `reel.edit.ts`) and is
 * sanitized again on the way out, so a project saved before the contract grew
 * a field still reads as a valid reel.
 */

export const REEL_ASSET_KINDS = ['VIDEO', 'IMAGE', 'AUDIO'] as const;
export type ReelAssetKind = (typeof REEL_ASSET_KINDS)[number];

export const REEL_ASSET_SOURCES = ['DRIVE', 'UPLOAD', 'STOCK', 'GENERATED'] as const;
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
  /** UPLOAD, STOCK, GENERATED: where the player reads it from. */
  url: string;
  /** 0 when Drive has not finished reading the file's metadata, or nobody measured it. */
  duration_ms: number;
  width: number;
  height: number;
  size_bytes: number;
  /** STOCK: the library's licence line; '' for Drive, an upload or generated sound. */
  licence: string;
  /** STOCK: the credit the library asks for ("Photo by X on Pexels"). */
  attribution: string;
  /** STOCK: the library's own id, so the same picture is not added twice. */
  provider_id: string;
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

/** The words that go with the reel on one network. */
export interface ReelVariant {
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  title: string;
}

/** One line of the last validation. */
export interface ReelCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface ReelProjectFields {
  name: string;
  drive_url: string;
  drive_folder_id: string;
  assets: ReelAsset[];
  spec: unknown;
  messages: ReelMessage[];
  variants: ReelVariant[];
  /** Where in the reel the cover frame is taken; null for the first frame. */
  cover_at_ms: number | null;
  checks: ReelCheck[];
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
    licence: { type: String, default: '' },
    attribution: { type: String, default: '' },
    provider_id: { type: String, default: '' },
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

const variantSchema = new Schema<ReelVariant>(
  {
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    caption: { type: String, default: '' },
    hashtags: { type: [String], default: [] },
    title: { type: String, default: '' },
  },
  { _id: false }
);

const checkSchema = new Schema<ReelCheck>(
  {
    name: { type: String, required: true },
    pass: { type: Boolean, default: false },
    detail: { type: String, default: '' },
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
    variants: { type: [variantSchema], default: [] },
    cover_at_ms: { type: Number, default: null },
    checks: { type: [checkSchema], default: [] },
    created_by: { type: String, default: '' },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'reel_projects' }
);

projectSchema.index({ updated_at: -1 });

export const ReelProjectModel =
  mongoose.models.ReelProject ?? mongoose.model<IReelProject>('ReelProject', projectSchema);
