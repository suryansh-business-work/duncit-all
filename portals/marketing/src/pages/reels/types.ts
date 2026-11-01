import type {
  ReelAsset as GeneratedReelAsset,
  ReelCorner,
  ReelProject as GeneratedReelProject,
  ReelProjectSummary as GeneratedReelProjectSummary,
  ReelSpec as GeneratedReelSpec,
} from '@duncit/gql-types';
import type { SocialPlatform } from '../social-accounts-page/queries';

/**
 * Reel Studio's shapes. The parts the generated GraphQL types already carry
 * are re-exported; what the studio contract adds on top of them — stock and
 * generated footage, the reel's aspect, brand, captions and voiceover, its
 * variants, checks, cover and posts — is written out here against the server
 * contract, so the studio compiles against the fields it reads before the
 * generated types catch up with the schema.
 */
export type {
  ReelAssetKind,
  ReelCorner,
  ReelDriveEntry,
  ReelDriveFolder,
  ReelDriveStatus,
  ReelMessage,
  ReelMusic,
  ReelOverlay,
  ReelScene,
  ReelText,
} from '@duncit/gql-types';

/** Where a piece of footage came from. */
export type ReelAssetSource = 'DRIVE' | 'UPLOAD' | 'STOCK' | 'GENERATED';

export interface ReelAsset extends Omit<GeneratedReelAsset, 'source'> {
  source: ReelAssetSource;
  /** STOCK: the licence the provider publishes the file under; empty otherwise. */
  licence: string;
  /** STOCK: who to credit; empty otherwise. */
  attribution: string;
  /** STOCK: the provider's own id, so the same file is never added twice. */
  provider_id: string;
}

/** The frame a reel is cut for: 1080×1920, 1080×1080 or 1920×1080. */
export type ReelAspect = 'PORTRAIT' | 'SQUARE' | 'LANDSCAPE';

/** How a reel's words are drawn. */
export type ReelCaptionStyle = 'PLAIN' | 'BOX' | 'HIGHLIGHT';

export interface ReelVoiceover {
  asset_id: string;
  /** 0–1. */
  volume: number;
}

export interface ReelBrand {
  /** An IMAGE asset drawn over every scene; empty for none. */
  watermark_asset_id: string;
  watermark_corner: ReelCorner;
  watermark_width_pct: number;
  /** A hex colour the captions and pills pick up; empty for none. */
  primary_color: string;
}

export interface ReelCaptions {
  style: ReelCaptionStyle;
}

export interface ReelSpec extends GeneratedReelSpec {
  aspect: ReelAspect;
  voiceover: ReelVoiceover | null;
  brand: ReelBrand;
  captions: ReelCaptions;
}

/** The caption a reel is posted with on one network. */
export interface ReelVariant {
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  title: string;
}

/** One pre-export check, as the server last ran it. */
export interface ReelCheck {
  name: string;
  pass: boolean;
  detail: string;
}

/** A social post made from this reel. */
export interface ReelPostRef {
  post_id: string;
  platform: SocialPlatform;
  permalink: string;
  published_at: string | null;
}

export interface ReelProject extends Omit<GeneratedReelProject, 'assets' | 'spec'> {
  assets: ReelAsset[];
  spec: ReelSpec;
  variants: ReelVariant[];
  /** The frame used as the cover, in milliseconds of the reel; null until one is picked. */
  cover_at_ms: number | null;
  checks: ReelCheck[];
  posts: ReelPostRef[];
}

/** A reel in the list: the summary, plus how it stands once posted. */
export interface ReelProjectSummary extends GeneratedReelProjectSummary {
  /** The cover frame; empty until one is picked. */
  cover_url: string;
  /** How the last pre-export check went; null until one has run. */
  last_check_pass: boolean | null;
  posts_count: number;
  views: number;
}

/** One stock file as the provider search answers it. */
export interface ReelStockItem {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  preview_url: string;
  width: number;
  height: number;
  duration_ms: number;
  licence: string;
  attribution: string;
  provider_id: string;
}

export interface ReelStockPage {
  items: ReelStockItem[];
  has_more: boolean;
}

/** What `addReelStockAssets` is handed for one file. */
export interface ReelStockInput {
  provider_id: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  preview_url: string;
  name: string;
  width: number;
  height: number;
  duration_ms: number;
  licence: string;
  attribution: string;
}

/** What `addReelUploadAssets` is handed for one file. */
export interface ReelUploadInput {
  url: string;
  name: string;
  width: number;
  height: number;
  size_bytes: number;
}

export interface ReelConcept {
  id: string;
  title: string;
  hook: string;
  angle: string;
  why: string;
}

export interface ReelScriptScene {
  text: string;
  shot: string;
  duration_ms: number;
  asset_query: string;
}

export interface ReelScript {
  hooks: string[];
  scenes: ReelScriptScene[];
  cta: string;
}

export interface ReelRecommendation {
  title: string;
  why: string;
  evidence: string;
}

export interface ReelPostAnalytics {
  platform: SocialPlatform;
  permalink: string;
  published_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

export interface ReelAnalytics {
  posts: ReelPostAnalytics[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

/**
 * The AI Library category a prompt saved from the studio is filed under. It is
 * the same name the server gives the editor's own code prompts, so the library
 * lists the studio's standing instruction and the operator's saved requests
 * side by side.
 */
export const REEL_PROMPT_CATEGORY = 'Reel Studio';

/** Where chat uploads land in the media store. */
export const REEL_UPLOAD_FOLDER = '/ai/reels';

/** Pictures one chat message may carry — the server refuses more. */
export const MAX_ATTACHMENTS = 6;

/** The longest request the editor reads — the server refuses more. */
export const MAX_REQUEST_LENGTH = 2000;
