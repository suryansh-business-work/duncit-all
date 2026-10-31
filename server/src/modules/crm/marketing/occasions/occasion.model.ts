import { Schema, model } from 'mongoose';
import { THEME_TOKEN_KEYS } from '@modules/platform/settings/theme-tokens';
import {
  OCCASION_ARTWORKS,
  OCCASION_COLOR_MODES,
  OCCASION_DIRECTIONS,
  OCCASION_GARLAND_STYLES,
  OCCASION_LIVE_MODES,
  OCCASION_MOTIONS,
  OCCASION_OVERLAY_STYLES,
  OCCASION_REGIONS,
  OCCASION_SHAPES,
  type OccasionLiveMode,
  type OccasionThemeDoc,
} from './occasion.types';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' } as const;

/** One mode's colour tokens; '' keeps the app's own value. */
const paletteSchema = new Schema(
  Object.fromEntries(THEME_TOKEN_KEYS.map((key) => [key, { type: String, default: '' }])),
  { _id: false }
);

const particleSchema = new Schema(
  {
    shapes: { type: [String], enum: OCCASION_SHAPES, default: [] },
    custom_paths: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    motion: { type: String, enum: OCCASION_MOTIONS, default: 'FALL' },
    count: { type: Number, default: 30 },
    size_min: { type: Number, default: 6 },
    size_max: { type: Number, default: 14 },
    speed: { type: Number, default: 40 },
    opacity: { type: Number, default: 0.9 },
  },
  { _id: false }
);

const vectorLayerSchema = new Schema(
  {
    path: { type: String, required: true },
    fill: { type: String, default: '' },
    stroke: { type: String, default: '' },
    stroke_width: { type: Number, default: 0 },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  { _id: false }
);

const flyerSchema = new Schema(
  {
    artwork: { type: String, enum: OCCASION_ARTWORKS, default: 'SHOOTING_STAR' },
    custom_layers: { type: [vectorLayerSchema], default: [] },
    image_url: { type: String, default: '' },
    direction: { type: String, enum: OCCASION_DIRECTIONS, default: 'LTR' },
    altitude_min: { type: Number, default: 10 },
    altitude_max: { type: Number, default: 25 },
    size: { type: Number, default: 160 },
    duration: { type: Number, default: 12 },
    interval: { type: Number, default: 30 },
    bob: { type: Number, default: 8 },
    trail_color: { type: String, default: '' },
  },
  { _id: false }
);

const fireworksSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    colors: { type: [String], default: [] },
    bursts_per_minute: { type: Number, default: 12 },
    sparks: { type: Number, default: 28 },
    radius: { type: Number, default: 90 },
  },
  { _id: false }
);

const overlaySchema = new Schema(
  {
    style: { type: String, enum: OCCASION_OVERLAY_STYLES, default: 'NONE' },
    color: { type: String, default: '#000000' },
    opacity: { type: Number, default: 0.2 },
  },
  { _id: false }
);

const garlandSchema = new Schema(
  {
    style: { type: String, enum: OCCASION_GARLAND_STYLES, default: 'NONE' },
    colors: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * A festive look for the Duncit apps: colour tokens per mode, decoration and
 * an optional window when it goes live by itself. Built-in festivals are
 * seeded once (and can be edited, or reset to how they shipped); anything else
 * is made in Marketing → Occasions or by an MCP agent through the same API.
 */
const occasionThemeSchema = new Schema<OccasionThemeDoc>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', trim: true, maxlength: 280 },
    region: { type: String, enum: OCCASION_REGIONS, default: 'CUSTOM' },
    color_mode: { type: String, enum: OCCASION_COLOR_MODES, default: 'AUTO' },
    palette_light: { type: paletteSchema, default: () => ({}) },
    palette_dark: { type: paletteSchema, default: () => ({}) },
    particles: { type: [particleSchema], default: [] },
    flyers: { type: [flyerSchema], default: [] },
    fireworks: { type: fireworksSchema, default: () => ({}) },
    overlays: { type: [overlaySchema], default: [] },
    garland: { type: garlandSchema, default: () => ({}) },
    greeting: { type: String, default: '', trim: true, maxlength: 80 },
    starts_at: { type: Date, default: null },
    ends_at: { type: Date, default: null },
    schedule_enabled: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    is_builtin: { type: Boolean, default: false },
    is_archived: { type: Boolean, default: false },
  },
  { timestamps }
);

// The schedule resolver reads only switched-on, live windows; this keeps that read off a scan.
occasionThemeSchema.index({ schedule_enabled: 1, is_archived: 1 });

export const OccasionThemeModel = model<OccasionThemeDoc>('OccasionTheme', occasionThemeSchema, 'occasion_themes');

export interface OccasionSettingsDoc {
  singleton_key: string;
  mode: OccasionLiveMode;
  /** The pinned look while `mode` is MANUAL. */
  manual_key: string;
  updated_at?: Date;
}

/** Which look the apps wear: none, one pinned, or whatever the schedule says. */
const occasionSettingsSchema = new Schema<OccasionSettingsDoc>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'occasions' },
    mode: { type: String, enum: OCCASION_LIVE_MODES, default: 'NORMAL' },
    manual_key: { type: String, default: '' },
  },
  { timestamps }
);

export const OccasionSettingsModel = model<OccasionSettingsDoc>('OccasionSettings', occasionSettingsSchema, 'occasion_settings');
