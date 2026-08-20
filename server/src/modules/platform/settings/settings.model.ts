import { Schema, model, type Document } from "mongoose";

export interface IAppSettings extends Document {
  singleton_key: string;
  jwt_expires_in: string | null;
  jwt_no_expiry: boolean;
  date_format: string;
  time_format: string;
  /** IANA timezone used to format/display dates & times across all apps. */
  time_zone: string;
  /** Where every app reads "now" from: SERVER | BROWSER | CUSTOM. */
  time_source: string;
  /** CUSTOM anchor: the instant the apps' clock should read. */
  custom_time: Date | null;
  /** Server's real time when the anchor was saved — the apps tick forward from
   * here, so a custom clock advances instead of freezing. */
  custom_time_set_at: Date | null;
  /** Minimum age (whole years) required to sign up and to save a date of birth,
   * configurable from Admin > Settings. */
  min_signup_age: number;
  /** Days a Create-Pod draft is retained (from its last save) before the
   * background cleanup permanently deletes it. Admin > Pods > Pod Settings. */
  draft_retention_days: number;
  /** Max Backout attempts a user gets per pod (Admin > Pods > Pod Settings).
   * Each successful "Backout in process" counts one attempt. */
  max_backout_attempts: number;
  /** Account Health points deducted from a venue when its owner cancels a pod
   * booked there (Admin > Pods > Pod Settings). 0 disables the penalty. */
  venue_cancel_health_penalty: number;
  /** Whether a host must verify an attendee's name + phone over OTP before
   * marking them present by hand (Admin > Pods > Pod Settings). Switched off,
   * the host vouches for the identity themselves and the mark is recorded as
   * unverified. The door scan is proof on its own and is unaffected either way. */
  attendance_otp_required: boolean;
  created_at: Date;
  updated_at: Date;
}

const appSettingsSchema = new Schema<IAppSettings>(
  {
    singleton_key: {
      type: String,
      required: true,
      unique: true,
      default: "app",
    },
    jwt_expires_in: { type: String, default: "7d" },
    jwt_no_expiry: { type: Boolean, default: false },
    date_format: { type: String, default: "dd MMM yyyy" },
    time_format: { type: String, default: "hh:mm a" },
    time_zone: { type: String, default: "Asia/Kolkata" },
    time_source: { type: String, enum: ["SERVER", "BROWSER", "CUSTOM"], default: "SERVER" },
    custom_time: { type: Date, default: null },
    custom_time_set_at: { type: Date, default: null },
    min_signup_age: { type: Number, default: 18 },
    draft_retention_days: { type: Number, default: 3, min: 1 },
    max_backout_attempts: { type: Number, default: 3, min: 1 },
    venue_cancel_health_penalty: { type: Number, default: 5, min: 0, max: 100 },
    attendance_otp_required: { type: Boolean, default: true },
    // `coin_earn_pct` used to live here. It moved to CoinSettings — split into a
    // pod-join and a shop rate — where the rest of the coin payout rules are;
    // coinSettingsService.seed() carries the configured value across on the
    // first boot after the move.
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const AppSettingsModel = model<IAppSettings>(
  "AppSettings",
  appSettingsSchema,
);

export interface IFeatureFlag extends Document {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: false },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const FeatureFlagModel = model<IFeatureFlag>(
  "FeatureFlag",
  featureFlagSchema,
);

export interface IBranding extends Document {
  singleton_key: string;
  app_name: string;
  logo_url: string;
  primary_color: string;
  support_email: string;
  support_phone: string;
  // Per-platform assets (admin Branding accordions 1A/1B/1C). Empty string
  // falls back to the global logo_url / bundled defaults on each client.
  mweb_favicon_url: string;
  mweb_logo_url: string;
  mweb_splash_url: string;
  mweb_splash_type: string;
  mobile_favicon_url: string;
  mobile_logo_url: string;
  mobile_splash_url: string;
  mobile_splash_type: string;
  portals_favicon_url: string;
  portals_logo_url: string;
  portals_splash_url: string;
  portals_splash_type: string;
  // Autoplay/loop/muted background video of the "Venues" card in the consumer
  // account drawer (native + mWeb). Admin-managed — never hardcode the URL.
  venues_card_video_url: string;
  // Per-platform Google Font family names (admin Branding → Fonts tabs).
  // Empty string = each platform's built-in default (Quicksand).
  mobile_font_family: string;
  mweb_font_family: string;
  portals_font_family: string;
  // Marketing websites (duncit.com + partners/ads/earnwith subsites) — admin
  // Branding accordion 1D. Distinct from mweb_* (the PWA): these feed the
  // static Astro sites' header, footer and favicon at build time.
  website_header_logo_url: string;
  website_footer_logo_url: string;
  website_favicon_url: string;
  // App store listings for the shared "Download the app" website section.
  // Empty string = not live yet; the sites render a "coming soon" state.
  android_app_url: string;
  ios_app_url: string;
  // Icon for the synthetic "All" tab in the home "What's your vibe" tabber
  // (mWeb + mobile). Admin-managed from the Category catalogue; empty string
  // falls back to the bundled apps/grid icon on each client.
  home_all_vibe_icon_url: string;
  // Icon placement (TOP/BOTTOM/LEFT/RIGHT relative to the label) + size for the
  // "All" tab. null → the default TOP / 40×40 look on each client.
  home_all_vibe_icon_layout?: { position: string; width: number; height: number } | null;
  // When true, the home "What's your vibe" tabber shows EVERY category (with its
  // icon) even ones with no pods yet; false (default) shows only categories that
  // currently have pods. mWeb + mobile.
  home_show_all_vibe_categories: boolean;
  // Heading + sub-heading over the home "What's your vibe" (category) filter,
  // admin-managed from the Category catalogue. Empty string falls back to each
  // client's bundled copy (mWeb + mobile).
  home_vibe_heading: string;
  home_vibe_subheading: string;
  // Tagline shown in the home header, above the location (mWeb + mobile).
  home_header_tagline: string;
  // Latest released mobile app version (semver, e.g. "1.2.3"). Auto-synced on
  // every deploy from app/mobile-app/app.json via the APP_VERSION env. The
  // mobile app compares its baked-in version to this and force-updates when
  // it is behind.
  app_latest_version: string;
  // Oldest mobile build still allowed in (semver, e.g. "1.2.3"). Deliberately
  // NOT auto-synced: `app_latest_version` moves on every deploy, so gating on
  // it could lock users out of a build the store has not published yet. This is
  // raised by hand once a release is actually live. Blank = nobody is blocked.
  app_min_supported_version: string;
  // Global Pod Shop top slider (image/video), admin-managed from the products
  // portal. Shown above the platform-wide Pod Shop grid on mobile + mWeb.
  pod_shop_slider: {
    url: string;
    type: string;
    order: number;
    heading: string;
    subheading: string;
    cta_label: string;
    cta_url: string;
  }[];
  /** Festive icon windows; the active one swaps the apps' icons by date. */
  occasional_icons: {
    slug: string;
    label: string;
    starts_at: Date;
    ends_at: Date;
    icon_url: string;
    fallback_icon: string;
    is_active: boolean;
    sort_order: number;
  }[];
  created_at: Date;
  updated_at: Date;
}

/** One festive window: while "now" (per the app time source) sits inside it,
 * the apps swap in this occasion's icons. `slug` doubles as the folder name the
 * native app loads its bundled icons from. */
const occasionalIconSchema = new Schema<{
  slug: string;
  label: string;
  starts_at: Date;
  ends_at: Date;
  icon_url: string;
  fallback_icon: string;
  is_active: boolean;
  sort_order: number;
}>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    label: { type: String, default: "" },
    starts_at: { type: Date, required: true },
    ends_at: { type: Date, required: true },
    icon_url: { type: String, default: "" },
    fallback_icon: { type: String, default: "occasion" },
    is_active: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  { _id: false },
);

const podShopSliderMediaSchema = new Schema<{
  url: string;
  type: string;
  order: number;
  heading: string;
  subheading: string;
  cta_label: string;
  cta_url: string;
}>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["IMAGE", "VIDEO"], default: "IMAGE" },
    order: { type: Number, default: 0 },
    heading: { type: String, default: "" },
    subheading: { type: String, default: "" },
    cta_label: { type: String, default: "" },
    cta_url: { type: String, default: "" },
  },
  { _id: false },
);

const HOME_VIBE_ICON_POSITIONS = ["TOP", "BOTTOM", "LEFT", "RIGHT"];

const homeAllVibeIconLayoutSchema = new Schema<{
  position: string;
  width: number;
  height: number;
}>(
  {
    position: { type: String, enum: HOME_VIBE_ICON_POSITIONS, default: "TOP" },
    width: { type: Number, default: 40, min: 1, max: 200 },
    height: { type: Number, default: 40, min: 1, max: 200 },
  },
  { _id: false },
);

const brandingSchema = new Schema<IBranding>(
  {
    singleton_key: {
      type: String,
      required: true,
      unique: true,
      default: "branding",
    },
    app_name: { type: String, default: "Duncit" },
    logo_url: { type: String, default: "" },
    primary_color: { type: String, default: "#1976d2" },
    support_email: { type: String, default: "" },
    support_phone: { type: String, default: "" },
    mweb_favicon_url: { type: String, default: "" },
    mweb_logo_url: { type: String, default: "" },
    mweb_splash_url: { type: String, default: "" },
    mweb_splash_type: { type: String, default: "IMAGE" },
    mobile_favicon_url: { type: String, default: "" },
    mobile_logo_url: { type: String, default: "" },
    mobile_splash_url: { type: String, default: "" },
    mobile_splash_type: { type: String, default: "IMAGE" },
    portals_favicon_url: { type: String, default: "" },
    portals_logo_url: { type: String, default: "" },
    portals_splash_url: { type: String, default: "" },
    portals_splash_type: { type: String, default: "IMAGE" },
    // Direct CDN file (the pexels.com/download/… link is a 302 redirect that
    // native/web video players may refuse to follow).
    venues_card_video_url: {
      type: String,
      default: "https://ik.imagekit.io/esdata1/pods/13903093_1920_1080_60fps_CGCbnkfjK.mp4?tr=orig",
    },
    mobile_font_family: { type: String, default: "" },
    mweb_font_family: { type: String, default: "" },
    portals_font_family: { type: String, default: "" },
    website_header_logo_url: { type: String, default: "" },
    website_footer_logo_url: { type: String, default: "" },
    website_favicon_url: { type: String, default: "" },
    android_app_url: { type: String, default: "" },
    ios_app_url: { type: String, default: "" },
    home_all_vibe_icon_url: { type: String, default: "" },
    home_all_vibe_icon_layout: { type: homeAllVibeIconLayoutSchema, default: null },
    home_show_all_vibe_categories: { type: Boolean, default: false },
    home_vibe_heading: { type: String, default: "" },
    home_vibe_subheading: { type: String, default: "" },
    home_header_tagline: { type: String, default: "It All Starts Here!" },
    app_latest_version: { type: String, default: "" },
    app_min_supported_version: { type: String, default: "" },
    pod_shop_slider: { type: [podShopSliderMediaSchema], default: [] },
    occasional_icons: { type: [occasionalIconSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const BrandingModel = model<IBranding>("Branding", brandingSchema);
