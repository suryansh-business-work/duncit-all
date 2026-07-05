import { Schema, model, type Document } from "mongoose";

export interface IAppSettings extends Document {
  singleton_key: string;
  jwt_expires_in: string | null;
  jwt_no_expiry: boolean;
  date_format: string;
  time_format: string;
  /** IANA timezone used to format/display dates & times across all apps. */
  time_zone: string;
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
  mascot_name: string;
  mascot_description_html: string;
  mascot_image_url: string;
  mascot_lottie_url: string;
  mascot_on_chair_lottie_url: string;
  mascot_winner_lottie_url: string;
  welcome_lottie_url: string;
  app_loader_lottie_url: string;
  confetti_lottie_url: string;
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
  created_at: Date;
  updated_at: Date;
}

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
    mascot_name: { type: String, default: "Duncit" },
    mascot_description_html: { type: String, default: "" },
    // Uploaded mascot image (transparent PNG). Replaces the Lottie mascot.
    mascot_image_url: { type: String, default: "" },
    mascot_lottie_url: { type: String, default: "" },
    mascot_on_chair_lottie_url: { type: String, default: "" },
    mascot_winner_lottie_url: { type: String, default: "" },
    welcome_lottie_url: { type: String, default: "" },
    app_loader_lottie_url: { type: String, default: "" },
    confetti_lottie_url: { type: String, default: "" },
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
    website_header_logo_url: { type: String, default: "" },
    website_footer_logo_url: { type: String, default: "" },
    website_favicon_url: { type: String, default: "" },
    android_app_url: { type: String, default: "" },
    ios_app_url: { type: String, default: "" },
    home_all_vibe_icon_url: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const BrandingModel = model<IBranding>("Branding", brandingSchema);
