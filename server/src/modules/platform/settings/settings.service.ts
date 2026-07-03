import { GraphQLError } from "graphql";
import {
  AppSettingsModel,
  FeatureFlagModel,
  BrandingModel,
} from "./settings.model";
import { getRuntimeEnvValue } from "@config/runtimeEnv";
import {
  setReopenWindowZone,
  DEFAULT_REOPEN_ZONE,
} from "@modules/support/reopenWindow";

const toAppPub = (d: any) => ({
  jwt_expires_in: d?.jwt_expires_in ?? null,
  jwt_no_expiry: true,
  date_format: d?.date_format ?? "dd MMM yyyy",
  time_format: d?.time_format ?? "hh:mm a",
  time_zone: d?.time_zone ?? DEFAULT_REOPEN_ZONE,
  updated_at: d?.updated_at?.toISOString?.() ?? "",
});

const toFlagPub = (d: any) => {
  if (!d) return null;
  return {
    id: String(d._id),
    key: d.key,
    name: d.name,
    description: d.description ?? "",
    enabled: !!d.enabled,
    is_system: !!d.is_system,
    created_at: d.created_at?.toISOString?.() ?? "",
    updated_at: d.updated_at?.toISOString?.() ?? "",
  };
};

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, {
    extensions: { code: "NOT_FOUND" },
  });
}

const BRANDING_FIELDS = [
  "app_name",
  "logo_url",
  "primary_color",
  "support_email",
  "support_phone",
  "mascot_name",
  "mascot_description_html",
  "mascot_image_url",
  "mascot_lottie_url",
  "mascot_on_chair_lottie_url",
  "mascot_winner_lottie_url",
  "welcome_lottie_url",
  "app_loader_lottie_url",
  "confetti_lottie_url",
  "mweb_favicon_url",
  "mweb_logo_url",
  "mweb_splash_url",
  "mweb_splash_type",
  "mobile_favicon_url",
  "mobile_logo_url",
  "mobile_splash_url",
  "mobile_splash_type",
  "portals_favicon_url",
  "portals_logo_url",
  "portals_splash_url",
  "portals_splash_type",
  "website_header_logo_url",
  "website_footer_logo_url",
  "website_favicon_url",
  "android_app_url",
  "ios_app_url",
] as const;
type BrandingField = (typeof BRANDING_FIELDS)[number];

const brandingToPub = (doc: any) => ({
  app_name: doc.app_name ?? "Duncit",
  logo_url: doc.logo_url ?? "",
  primary_color: doc.primary_color ?? "#1976d2",
  support_email: doc.support_email ?? "",
  support_phone: doc.support_phone ?? "",
  mascot_name: doc.mascot_name ?? "Duncit",
  mascot_description_html: doc.mascot_description_html ?? "",
  mascot_image_url: doc.mascot_image_url ?? "",
  mascot_lottie_url: doc.mascot_lottie_url ?? "",
  mascot_on_chair_lottie_url: doc.mascot_on_chair_lottie_url ?? "",
  mascot_winner_lottie_url: doc.mascot_winner_lottie_url ?? "",
  welcome_lottie_url: doc.welcome_lottie_url ?? "",
  app_loader_lottie_url: doc.app_loader_lottie_url ?? "",
  confetti_lottie_url: doc.confetti_lottie_url ?? "",
  mweb_favicon_url: doc.mweb_favicon_url ?? "",
  mweb_logo_url: doc.mweb_logo_url ?? "",
  mweb_splash_url: doc.mweb_splash_url ?? "",
  mweb_splash_type: doc.mweb_splash_type ?? "IMAGE",
  mobile_favicon_url: doc.mobile_favicon_url ?? "",
  mobile_logo_url: doc.mobile_logo_url ?? "",
  mobile_splash_url: doc.mobile_splash_url ?? "",
  mobile_splash_type: doc.mobile_splash_type ?? "IMAGE",
  portals_favicon_url: doc.portals_favicon_url ?? "",
  portals_logo_url: doc.portals_logo_url ?? "",
  portals_splash_url: doc.portals_splash_url ?? "",
  portals_splash_type: doc.portals_splash_type ?? "IMAGE",
  website_header_logo_url: doc.website_header_logo_url ?? "",
  website_footer_logo_url: doc.website_footer_logo_url ?? "",
  website_favicon_url: doc.website_favicon_url ?? "",
  android_app_url: doc.android_app_url ?? "",
  ios_app_url: doc.ios_app_url ?? "",
  updated_at: doc.updated_at?.toISOString?.() ?? "",
});

const DEFAULT_FLAGS: {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}[] = [
  {
    key: "public_signup",
    name: "Public Signup",
    description: "Allow new users to register from the web app.",
    enabled: true,
  },
  {
    key: "venue_booking",
    name: "Venue Booking",
    description: "Enable venue booking flow.",
    enabled: true,
  },
  {
    key: "pod_creation",
    name: "Pod Creation",
    description: "Allow hosts to create pods.",
    enabled: true,
  },
  {
    key: "maintenance_mode",
    name: "Maintenance Mode",
    description: "Show maintenance banner across apps.",
    enabled: false,
  },
  {
    key: "pod_plans_section",
    name: "Pod Plans Section",
    description: "Show the Pod Plans nav entry in the mobile web app.",
    enabled: false,
  },
  {
    key: "whatsapp_signup_otp",
    name: "WhatsApp Signup OTP",
    description: "Ask the user to verify a WhatsApp number after signup.",
    enabled: false,
  },
  {
    key: "is_product_visible",
    name: "Product Features Visible",
    description:
      "Show all product features (Pod Shop, product management, Create-a-Pod products step, product nav) across apps and portals.",
    enabled: false,
  },
];

export const settingsService = {
  async getAppSettings() {
    let doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    if (!doc) doc = await AppSettingsModel.create({ singleton_key: "app" });
    return toAppPub(doc);
  },

  async getPublicAppSettings() {
    let doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    if (!doc) doc = await AppSettingsModel.create({ singleton_key: "app" });
    return {
      date_format: doc.date_format ?? "dd MMM yyyy",
      time_format: doc.time_format ?? "hh:mm a",
      time_zone: doc.time_zone ?? DEFAULT_REOPEN_ZONE,
    };
  },

  /**
   * Public, non-secret client config the web/native apps need before login
   * (Google OAuth client id + Maps key). Sourced from the Tech portal's
   * GOOGLE_OAUTH / GOOGLE_MAPS env categories so nothing is hardcoded in the
   * frontends. Both values are inherently public (already exposed to browsers).
   */
  async getPublicClientConfig() {
    const [googleClientId, googleMapsApiKey] = await Promise.all([
      getRuntimeEnvValue("GOOGLE_CLIENT_ID"),
      getRuntimeEnvValue("GOOGLE_MAP_API"),
    ]);
    return {
      google_client_id: googleClientId ?? "",
      google_maps_api_key: googleMapsApiKey ?? "",
    };
  },

  async updateAppSettings(input: {
    jwt_expires_in?: string | null;
    jwt_no_expiry?: boolean;
    date_format?: string;
    time_format?: string;
    time_zone?: string;
  }) {
    const update: any = {};
    if (input.jwt_no_expiry !== undefined)
      update.jwt_no_expiry = input.jwt_no_expiry;
    if (input.jwt_expires_in !== undefined)
      update.jwt_expires_in = input.jwt_expires_in;
    if (input.date_format !== undefined) update.date_format = input.date_format;
    if (input.time_format !== undefined) update.time_format = input.time_format;
    if (input.time_zone !== undefined) update.time_zone = input.time_zone;
    const doc = await AppSettingsModel.findOneAndUpdate(
      { singleton_key: "app" },
      { $set: update },
      { new: true, upsert: true },
    );
    // Keep the reopen-window day boundaries aligned with the configured zone.
    if (input.time_zone !== undefined) setReopenWindowZone(doc.time_zone);
    return toAppPub(doc);
  },

  /**
   * Refresh process-level caches that derive from app settings (currently the
   * support reopen-window timezone). Called once on boot after the singleton is
   * seeded so day-boundary math matches the admin-configured zone.
   */
  async refreshDerivedCaches() {
    const doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    setReopenWindowZone(doc?.time_zone ?? DEFAULT_REOPEN_ZONE);
  },

  async listFlags() {
    const all = await FeatureFlagModel.find().sort({ key: 1 });
    return all.map(toFlagPub);
  },

  async getFlag(key: string) {
    const f = await FeatureFlagModel.findOne({ key: key.toLowerCase() });
    return toFlagPub(f);
  },

  async listPublicFlags() {
    const all = await FeatureFlagModel.find({}, { key: 1, enabled: 1 }).sort({
      key: 1,
    });
    return all.map((d: any) => ({ key: d.key, enabled: !!d.enabled }));
  },

  async createFlag(input: {
    key: string;
    name: string;
    description?: string;
    enabled?: boolean;
  }) {
    const key = input.key.toLowerCase().trim();
    const exists = await FeatureFlagModel.findOne({ key });
    if (exists)
      throw new GraphQLError("Flag key exists", {
        extensions: { code: "CONFLICT" },
      });
    const created = await FeatureFlagModel.create({
      key,
      name: input.name,
      description: input.description ?? "",
      enabled: !!input.enabled,
    });
    return toFlagPub(created);
  },

  async updateFlag(
    id: string,
    input: { name?: string; description?: string; enabled?: boolean },
  ) {
    const updated = await FeatureFlagModel.findByIdAndUpdate(id, input, {
      new: true,
    });
    if (!updated) notFound("FeatureFlag");
    return toFlagPub(updated);
  },

  async setFlagEnabled(id: string, enabled: boolean) {
    const updated = await FeatureFlagModel.findByIdAndUpdate(
      id,
      { enabled },
      { new: true },
    );
    if (!updated) notFound("FeatureFlag");
    return toFlagPub(updated);
  },

  async deleteFlag(id: string) {
    const f = await FeatureFlagModel.findById(id);
    if (!f) notFound("FeatureFlag");
    if (f!.is_system) {
      throw new GraphQLError("System flag cannot be deleted", {
        extensions: { code: "FORBIDDEN" },
      });
    }
    await f!.deleteOne();
    return true;
  },

  async getBranding() {
    let doc = await BrandingModel.findOne({ singleton_key: "branding" });
    if (!doc) doc = await BrandingModel.create({ singleton_key: "branding" });
    return brandingToPub(doc);
  },

  async updateBranding(input: Partial<Record<BrandingField, string>>) {
    const update: any = {};
    for (const k of BRANDING_FIELDS) {
      if (input[k] !== undefined) update[k] = input[k];
    }
    const doc = await BrandingModel.findOneAndUpdate(
      { singleton_key: "branding" },
      { $set: update },
      { new: true, upsert: true },
    );
    return brandingToPub(doc);
  },

  async seedDefaults() {
    await AppSettingsModel.updateOne(
      { singleton_key: "app" },
      { $setOnInsert: { jwt_expires_in: null, jwt_no_expiry: true } },
      { upsert: true },
    );
    await BrandingModel.updateOne(
      { singleton_key: "branding" },
      {
        $setOnInsert: {
          app_name: "Duncit",
          logo_url: "",
          primary_color: "#1976d2",
          support_email: "",
        },
      },
      { upsert: true },
    );
    for (const f of DEFAULT_FLAGS) {
      await FeatureFlagModel.updateOne(
        { key: f.key },
        {
          $setOnInsert: {
            key: f.key,
            name: f.name,
            description: f.description,
            enabled: f.enabled,
            is_system: true,
          },
        },
        { upsert: true },
      );
    }
  },
};
