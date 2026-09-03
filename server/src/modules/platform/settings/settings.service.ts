import { GraphQLError } from "graphql";
import {
  AppSettingsModel,
  FeatureFlagModel,
  BrandingModel,
} from "./settings.model";
import { getRuntimeEnvValue } from "@config/runtimeEnv";
import {
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from "@utils/table-query";
import {
  setReopenWindowZone,
  DEFAULT_REOPEN_ZONE,
} from "@modules/support/reopenWindow";
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, MAX_ACCOUNT_AGE_YEARS } from "@utils/age";
import { invalidateFeatureFlagCache } from "./featureFlag.gate";

/** Minimum joining age when the admin hasn't set an explicit value. */
const DEFAULT_MIN_SIGNUP_AGE = DEFAULT_MIN_ACCOUNT_AGE_YEARS;
/** Default draft-pod retention window (days) before auto-deletion. */
const DEFAULT_DRAFT_RETENTION_DAYS = 3;
/** Default max Backout attempts a user gets per pod. */
const DEFAULT_MAX_BACKOUT_ATTEMPTS = 3;
/** Default Account Health penalty when a venue owner cancels a pod. */
const DEFAULT_VENUE_CANCEL_HEALTH_PENALTY = 5;
/** OTP verification before a by-hand attendance mark is on unless switched off. */
const DEFAULT_ATTENDANCE_OTP_REQUIRED = true;
/** Auto-cancel of finance-negative pods is opt-in — cancelling pods is the one
 * action here that cannot be undone, so it never turns itself on. */
const DEFAULT_POD_AUTO_CANCEL_ENABLED = false;
/** Hours before a pod's start when the auto-cancel finance check runs. */
const DEFAULT_POD_AUTO_CANCEL_LEAD_HOURS = 24;
/** Days of free slots a venue is offered when accepting an Auto Pod — short,
 * because the host and the club admin still need time to enrol before the date. */
const DEFAULT_AUTO_POD_SLOT_WINDOW_DAYS = 7;
/** Hours an Auto Pod waits for a venue before it leaves venues' lists and expires. */
const DEFAULT_AUTO_POD_VENUE_EXPIRY_HOURS = 24;
/** Hours an Auto Pod's venue, host and club admin have to all enrol before it is released. */
const DEFAULT_AUTO_POD_ASSIGNMENT_EXPIRY_HOURS = 72;
/** Account Health points a venue or host loses by withdrawing from an Auto Pod. */
const DEFAULT_AUTO_POD_CANCEL_HEALTH_PENALTY = 5;

const cleanRetentionDays = (value: unknown) =>
  Math.max(1, Math.floor(Number(value)) || DEFAULT_DRAFT_RETENTION_DAYS);

const cleanMaxBackoutAttempts = (value: unknown) =>
  Math.max(1, Math.floor(Number(value)) || DEFAULT_MAX_BACKOUT_ATTEMPTS);

/** Minimum joining age, clamped to a sane 1..120 so a typo cannot lock every
 * new user out (or let every child in). */
const cleanMinSignupAge = (value: unknown) =>
  Math.min(
    MAX_ACCOUNT_AGE_YEARS,
    Math.max(1, Math.floor(Number(value)) || DEFAULT_MIN_SIGNUP_AGE),
  );

// 0 is a legal value here (it disables the penalty), so the `|| DEFAULT` idiom
// the cleaners above use would silently turn a saved 0 back into 5.
const cleanVenueCancelHealthPenalty = (value: unknown) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : DEFAULT_VENUE_CANCEL_HEALTH_PENALTY;
};

/** Auto-cancel lead window, clamped to 1 hour – 1 year. */
const cleanPodAutoCancelLeadHours = (value: unknown) =>
  Math.min(8760, Math.max(1, Math.floor(Number(value)) || DEFAULT_POD_AUTO_CANCEL_LEAD_HOURS));

/** Auto Pod slot window, clamped to 1 – 60 days. */
const cleanAutoPodSlotWindowDays = (value: unknown) =>
  Math.min(60, Math.max(1, Math.floor(Number(value)) || DEFAULT_AUTO_POD_SLOT_WINDOW_DAYS));

/** Auto Pod venue window, clamped to 1 hour – 30 days. */
const cleanAutoPodVenueExpiryHours = (value: unknown) =>
  Math.min(720, Math.max(1, Math.floor(Number(value)) || DEFAULT_AUTO_POD_VENUE_EXPIRY_HOURS));

/** Auto Pod assignment window, clamped to 1 hour – 30 days. */
const cleanAutoPodAssignmentExpiryHours = (value: unknown) =>
  Math.min(
    720,
    Math.max(1, Math.floor(Number(value)) || DEFAULT_AUTO_POD_ASSIGNMENT_EXPIRY_HOURS),
  );

// 0 is a legal value here (it disables the penalty), so the `|| DEFAULT` idiom
// would silently turn a saved 0 back into 5.
const cleanAutoPodCancelHealthPenalty = (value: unknown) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : DEFAULT_AUTO_POD_CANCEL_HEALTH_PENALTY;
};

/** Account Health points a partner loses for filing a Request Change. One
 * default for all three roles — an admin sets each of them separately in
 * Admin > Pods > Pod Settings > Request Change Setting. */
const DEFAULT_CHANGE_REQUEST_HEALTH_PENALTY = 5;

/** 0 is a legal value (it disables the deduction), so this takes the
 * Number.isFinite form rather than `|| DEFAULT`. Capped at 10, which is what
 * the three cards and the mongoose schema also cap at. */
const cleanChangeRequestHealthPenalty = (value: unknown) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n)
    ? Math.min(10, Math.max(0, n))
    : DEFAULT_CHANGE_REQUEST_HEALTH_PENALTY;
};

const toAppPub = (d: any) => ({
  jwt_expires_in: d?.jwt_expires_in ?? null,
  jwt_no_expiry: true,
  date_format: d?.date_format ?? "dd MMM yyyy",
  time_format: d?.time_format ?? "hh:mm a",
  time_zone: d?.time_zone ?? DEFAULT_REOPEN_ZONE,
  time_source: d?.time_source ?? "SERVER",
  custom_time: d?.custom_time?.toISOString?.() ?? null,
  custom_time_set_at: d?.custom_time_set_at?.toISOString?.() ?? null,
  min_signup_age: d?.min_signup_age ?? DEFAULT_MIN_SIGNUP_AGE,
  draft_retention_days: d?.draft_retention_days ?? DEFAULT_DRAFT_RETENTION_DAYS,
  max_backout_attempts: d?.max_backout_attempts ?? DEFAULT_MAX_BACKOUT_ATTEMPTS,
  venue_cancel_health_penalty:
    d?.venue_cancel_health_penalty ?? DEFAULT_VENUE_CANCEL_HEALTH_PENALTY,
  // Defaults ON: a host marking someone present by hand is the one attendance
  // path with no scan behind it, so it starts verified until an admin says
  // otherwise.
  attendance_otp_required: d?.attendance_otp_required ?? DEFAULT_ATTENDANCE_OTP_REQUIRED,
  pod_auto_cancel_enabled: d?.pod_auto_cancel_enabled ?? DEFAULT_POD_AUTO_CANCEL_ENABLED,
  pod_auto_cancel_lead_hours:
    d?.pod_auto_cancel_lead_hours ?? DEFAULT_POD_AUTO_CANCEL_LEAD_HOURS,
  auto_pod_slot_window_days: cleanAutoPodSlotWindowDays(d?.auto_pod_slot_window_days),
  auto_pod_venue_expiry_hours: cleanAutoPodVenueExpiryHours(d?.auto_pod_venue_expiry_hours),
  auto_pod_assignment_expiry_hours: cleanAutoPodAssignmentExpiryHours(
    d?.auto_pod_assignment_expiry_hours,
  ),
  auto_pod_cancel_health_penalty: cleanAutoPodCancelHealthPenalty(d?.auto_pod_cancel_health_penalty),
  venue_change_request_health_penalty: cleanChangeRequestHealthPenalty(
    d?.venue_change_request_health_penalty,
  ),
  host_change_request_health_penalty: cleanChangeRequestHealthPenalty(
    d?.host_change_request_health_penalty,
  ),
  club_admin_change_request_health_penalty: cleanChangeRequestHealthPenalty(
    d?.club_admin_change_request_health_penalty,
  ),
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

/** Allowlists for the shared table engine (featureFlagsTable — DUNCIT TABLE CONTRACT v1). */
const FEATURE_FLAG_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ["key", "name", "description"],
  sortFields: {
    key: "key",
    name: "name",
    description: "description",
    enabled: "enabled",
    is_system: "is_system",
    created_at: "created_at",
    updated_at: "updated_at",
  },
  filterFields: {
    enabled: { type: "boolean" },
    is_system: { type: "boolean" },
  },
  defaultSort: { key: 1 },
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
  "venues_card_video_url",
  "login_background_image_url",
  "login_background_video_url",
  "mobile_font_family",
  "mweb_font_family",
  "portals_font_family",
  "website_header_logo_url",
  "website_footer_logo_url",
  "website_favicon_url",
  "android_app_url",
  "ios_app_url",
  "home_all_vibe_icon_url",
  "home_vibe_heading",
  "home_vibe_subheading",
  "home_header_tagline",
  "app_latest_version",
  "app_min_supported_version",
] as const;
type BrandingField = (typeof BRANDING_FIELDS)[number];

const VIBE_ICON_POSITIONS = new Set(["TOP", "BOTTOM", "LEFT", "RIGHT"]);
const DEFAULT_VIBE_ICON_SIZE = 40;

/** Clamp an icon dimension to 1–200 px, defaulting a missing/0/NaN value. */
const clampVibeIconSize = (value: unknown): number => {
  const rounded = Math.round(Number(value)) || DEFAULT_VIBE_ICON_SIZE;
  return Math.min(200, Math.max(1, rounded));
};

/**
 * Normalise the "All" tab icon-layout input: position defaults to TOP, width /
 * height are clamped to 1–200. Passing null/undefined clears the layout.
 */
const normalizeVibeIconLayout = (
  input?: { position?: string | null; width?: number | null; height?: number | null } | null,
) => {
  if (!input) return null;
  const rawPosition = input.position ?? "";
  return {
    position: VIBE_ICON_POSITIONS.has(rawPosition) ? rawPosition : "TOP",
    width: clampVibeIconSize(input.width),
    height: clampVibeIconSize(input.height),
  };
};

/** Stored "All" tab layout → GraphQL CategoryIconLayout (null when unset). */
const vibeIconLayoutToPub = (
  layout?: { position: string; width: number; height: number } | null,
) => (layout ? { position: layout.position, width: layout.width, height: layout.height } : null);

const brandingToPub = (doc: any) => ({
  app_name: doc.app_name ?? "Duncit",
  logo_url: doc.logo_url ?? "",
  primary_color: doc.primary_color ?? "#1976d2",
  support_email: doc.support_email ?? "",
  support_phone: doc.support_phone ?? "",
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
  venues_card_video_url:
    doc.venues_card_video_url ??
    "https://ik.imagekit.io/esdata1/pods/13903093_1920_1080_60fps_CGCbnkfjK.mp4?tr=orig",
  login_background_image_enabled: !!doc.login_background_image_enabled,
  login_background_image_url: doc.login_background_image_url ?? "",
  login_background_video_enabled: !!doc.login_background_video_enabled,
  login_background_video_url: doc.login_background_video_url ?? "",
  mobile_font_family: doc.mobile_font_family ?? "",
  mweb_font_family: doc.mweb_font_family ?? "",
  portals_font_family: doc.portals_font_family ?? "",
  website_header_logo_url: doc.website_header_logo_url ?? "",
  website_footer_logo_url: doc.website_footer_logo_url ?? "",
  website_favicon_url: doc.website_favicon_url ?? "",
  android_app_url: doc.android_app_url ?? "",
  ios_app_url: doc.ios_app_url ?? "",
  home_all_vibe_icon_url: doc.home_all_vibe_icon_url ?? "",
  home_all_vibe_icon_layout: vibeIconLayoutToPub(doc.home_all_vibe_icon_layout),
  home_show_all_vibe_categories: !!doc.home_show_all_vibe_categories,
  home_vibe_heading: doc.home_vibe_heading ?? "",
  home_vibe_subheading: doc.home_vibe_subheading ?? "",
  home_header_tagline: doc.home_header_tagline ?? "It All Starts Here!",
  app_latest_version: doc.app_latest_version ?? "",
  app_min_supported_version: doc.app_min_supported_version ?? "",
  pod_shop_slider: (doc.pod_shop_slider ?? []).map((m: any) => ({
    url: m.url,
    type: m.type ?? "IMAGE",
    order: m.order ?? 0,
    heading: m.heading ?? "",
    subheading: m.subheading ?? "",
    cta_label: m.cta_label ?? "",
    cta_url: m.cta_url ?? "",
  })),
  occasional_icons: (doc.occasional_icons ?? []).map((o: any) => ({
    slug: o.slug ?? "",
    label: o.label ?? "",
    starts_at: o.starts_at?.toISOString?.() ?? "",
    ends_at: o.ends_at?.toISOString?.() ?? "",
    icon_url: o.icon_url ?? "",
    fallback_icon: o.fallback_icon || "occasion",
    is_active: o.is_active !== false,
    sort_order: o.sort_order ?? 0,
  })),
  updated_at: doc.updated_at?.toISOString?.() ?? "",
});

/** Default Play Store URL when the admin hasn't set an explicit one. */
const DEFAULT_ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=com.duncit.mobile";

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
    key: "legal_sign_draw",
    name: "Contract Signing — Draw",
    description: "Allow signing a contract by drawing the signature.",
    enabled: true,
  },
  {
    key: "legal_sign_type",
    name: "Contract Signing — Type",
    description: "Allow signing a contract by typing the signature.",
    enabled: true,
  },
  {
    key: "legal_sign_upload",
    name: "Contract Signing — Upload",
    description: "Allow signing a contract by uploading a signature image.",
    enabled: true,
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
    // The one system kill switch for e-commerce. Off, and the server refuses
    // every product operation as well — hiding a button is never the only thing
    // holding the line. Seeded OFF: a fresh install ships without a shop.
    key: "is_product_visible",
    name: "Product Features Visible",
    description:
      "Show every product feature — the Pod Shop on a pod, the cart, the catalogue, the Create-a-Pod products step, brand and ShipRocket warehouse registration, product orders and the E-commerce studio — across the apps and the portals. Off, and product operations are refused server-side too.",
    enabled: false,
  },
  {
    key: "leaderboard",
    name: "Leaderboard",
    description:
      "Show the Leaderboard section (boards, points and rewards) in the mobile app and mobile web sidebar.",
    enabled: false,
  },
  {
    // Seeded ON: the tiers ship as "coming soon" with every CTA disabled, so
    // showing the page costs nothing — this flag is the switch to pull it back.
    key: "membership",
    name: "Membership",
    description:
      "Show the Membership section (tier pricing, comparison table and the notify-me form) in the mobile app and mobile web sidebar.",
    enabled: true,
  },
  {
    key: "tour_guide",
    name: "Tour Guide",
    description:
      "Show the guided walkthroughs in the mobile app and mobile web — the Tour Guide row in the profile menu and the tour overlay itself.",
    enabled: false,
  },
  {
    key: "gift_cards",
    name: "Gift Cards",
    description:
      "Show the Gift Cards section (buy a themed card, redeem a code into Duncit Coins) in the mobile app and mobile web sidebar, and allow purchases.",
    enabled: false,
  },
  {
    key: "auto_pods",
    name: "Auto Pods",
    description:
      "Show the Auto Pod sections (a venue accepts an admin-written pod, then a host and a club admin enrol) in the mobile app, mobile web, the Partners portal and Admin.",
    enabled: false,
  },
  {
    // Seeded ON so enabling this feature changes nothing for users already on
    // the current build — turning it OFF is the deliberate act.
    key: "force_app_update",
    name: "Force App Update",
    description:
      "Show the blocking App Update screen in the Android and iOS apps when the installed build is behind the latest published version. Turn off and an outdated build keeps working — nobody is forced to update.",
    enabled: true,
  },
];

type AppSettingsUpdateInput = {
  jwt_expires_in?: string | null;
  jwt_no_expiry?: boolean;
  date_format?: string;
  time_format?: string;
  time_zone?: string;
  time_source?: string;
  custom_time?: string | null;
  min_signup_age?: number;
  draft_retention_days?: number;
  max_backout_attempts?: number;
  venue_cancel_health_penalty?: number;
  attendance_otp_required?: boolean;
  pod_auto_cancel_enabled?: boolean;
  pod_auto_cancel_lead_hours?: number;
  auto_pod_slot_window_days?: number;
  auto_pod_venue_expiry_hours?: number;
  auto_pod_assignment_expiry_hours?: number;
  auto_pod_cancel_health_penalty?: number;
  venue_change_request_health_penalty?: number;
  host_change_request_health_penalty?: number;
  club_admin_change_request_health_penalty?: number;
};

/** Fields copied to the update as-is when the caller supplied them. */
const APP_SETTING_PASSTHROUGH_FIELDS = [
  "jwt_no_expiry",
  "jwt_expires_in",
  "date_format",
  "time_format",
  "time_zone",
  "time_source",
  "attendance_otp_required",
  "pod_auto_cancel_enabled",
] as const;

/** Saving an anchor stamps the server clock beside it, so every device can
 * advance the custom clock by the same elapsed amount. */
const customTimeUpdate = (raw: string | null) => {
  const anchor = raw ? new Date(raw) : null;
  const valid = anchor && !Number.isNaN(anchor.getTime()) ? anchor : null;
  return { custom_time: valid, custom_time_set_at: valid ? new Date() : null };
};

const buildAppSettingsUpdate = (input: AppSettingsUpdateInput) => {
  const update: any = {};
  for (const field of APP_SETTING_PASSTHROUGH_FIELDS) {
    if (input[field] !== undefined) update[field] = input[field];
  }
  if (input.custom_time !== undefined)
    Object.assign(update, customTimeUpdate(input.custom_time));
  if (input.min_signup_age !== undefined)
    update.min_signup_age = cleanMinSignupAge(input.min_signup_age);
  if (input.draft_retention_days !== undefined)
    update.draft_retention_days = cleanRetentionDays(input.draft_retention_days);
  if (input.max_backout_attempts !== undefined)
    update.max_backout_attempts = cleanMaxBackoutAttempts(input.max_backout_attempts);
  if (input.venue_cancel_health_penalty !== undefined)
    update.venue_cancel_health_penalty = cleanVenueCancelHealthPenalty(
      input.venue_cancel_health_penalty,
    );
  if (input.pod_auto_cancel_lead_hours !== undefined)
    update.pod_auto_cancel_lead_hours = cleanPodAutoCancelLeadHours(
      input.pod_auto_cancel_lead_hours,
    );
  if (input.auto_pod_slot_window_days !== undefined)
    update.auto_pod_slot_window_days = cleanAutoPodSlotWindowDays(input.auto_pod_slot_window_days);
  if (input.auto_pod_venue_expiry_hours !== undefined)
    update.auto_pod_venue_expiry_hours = cleanAutoPodVenueExpiryHours(
      input.auto_pod_venue_expiry_hours,
    );
  if (input.auto_pod_assignment_expiry_hours !== undefined)
    update.auto_pod_assignment_expiry_hours = cleanAutoPodAssignmentExpiryHours(
      input.auto_pod_assignment_expiry_hours,
    );
  if (input.auto_pod_cancel_health_penalty !== undefined)
    update.auto_pod_cancel_health_penalty = cleanAutoPodCancelHealthPenalty(
      input.auto_pod_cancel_health_penalty,
    );
  if (input.venue_change_request_health_penalty !== undefined)
    update.venue_change_request_health_penalty = cleanChangeRequestHealthPenalty(
      input.venue_change_request_health_penalty,
    );
  if (input.host_change_request_health_penalty !== undefined)
    update.host_change_request_health_penalty = cleanChangeRequestHealthPenalty(
      input.host_change_request_health_penalty,
    );
  if (input.club_admin_change_request_health_penalty !== undefined)
    update.club_admin_change_request_health_penalty = cleanChangeRequestHealthPenalty(
      input.club_admin_change_request_health_penalty,
    );
  return update;
};

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
      time_source: doc.time_source ?? "SERVER",
      custom_time: doc.custom_time?.toISOString?.() ?? null,
      custom_time_set_at: doc.custom_time_set_at?.toISOString?.() ?? null,
      // Stamped per response so clients keep the server clock ticking.
      server_time: new Date().toISOString(),
      min_signup_age: doc.min_signup_age ?? DEFAULT_MIN_SIGNUP_AGE,
      draft_retention_days: doc.draft_retention_days ?? DEFAULT_DRAFT_RETENTION_DAYS,
      max_backout_attempts: doc.max_backout_attempts ?? DEFAULT_MAX_BACKOUT_ATTEMPTS,
      venue_cancel_health_penalty:
        doc.venue_cancel_health_penalty ?? DEFAULT_VENUE_CANCEL_HEALTH_PENALTY,
      attendance_otp_required:
        doc.attendance_otp_required ?? DEFAULT_ATTENDANCE_OTP_REQUIRED,
    };
  },

  /** Clamped minimum joining age (1–120, default 18) — the age gate every DOB
   * input on every surface is validated against. */
  async getMinSignupAge(): Promise<number> {
    const doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    return cleanMinSignupAge(doc?.min_signup_age);
  },

  /** Clamped max-backout-attempts setting for the backout flow (min 1, default 3). */
  async getMaxBackoutAttempts(): Promise<number> {
    const doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    return cleanMaxBackoutAttempts(doc?.max_backout_attempts);
  },

  /** Clamped Account Health penalty (0–100, default 5) charged to a venue when
   * its owner cancels a pod booked there. */
  async getVenueCancelHealthPenalty(): Promise<number> {
    const doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    return cleanVenueCancelHealthPenalty(doc?.venue_cancel_health_penalty);
  },

  /**
   * The three Request Change deductions (0–10 each, default 5), read together.
   *
   * One round trip rather than three: a request only ever charges ONE of them,
   * but the studio cards state all three before anybody taps, and the
   * autoPodService.windows() batch is the precedent for reading a related set
   * in one go.
   */
  async getChangeRequestHealthPenalties(): Promise<{
    VENUE: number;
    HOST: number;
    CLUB_ADMIN: number;
  }> {
    const doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    return {
      VENUE: cleanChangeRequestHealthPenalty(doc?.venue_change_request_health_penalty),
      HOST: cleanChangeRequestHealthPenalty(doc?.host_change_request_health_penalty),
      CLUB_ADMIN: cleanChangeRequestHealthPenalty(
        doc?.club_admin_change_request_health_penalty,
      ),
    };
  },

  /** The auto-cancel sweep's knobs: whether it acts at all (default off) and
   * how many hours before a pod's start the finance check runs (default 24). */
  async getPodAutoCancelSettings(): Promise<{ enabled: boolean; lead_hours: number }> {
    const doc = await AppSettingsModel.findOne({ singleton_key: "app" });
    return {
      enabled: doc?.pod_auto_cancel_enabled ?? DEFAULT_POD_AUTO_CANCEL_ENABLED,
      lead_hours: cleanPodAutoCancelLeadHours(doc?.pod_auto_cancel_lead_hours),
    };
  },

  // The Duncit Coin earn rate used to be read here. It is a coin payout rule
  // now, alongside the others, in coinSettingsService (Finance > Duncit Coin >
  // Settings) — and split in two, since a pod join and a shop order earn at
  // their own rates.

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

  async updateAppSettings(input: AppSettingsUpdateInput) {
    const update = buildAppSettingsUpdate(input);
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

  /** Server-side table page (search/filter/sort/paginate) for the featureFlagsTable query. */
  async flagsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      FeatureFlagModel,
      {},
      input,
      FEATURE_FLAG_TABLE_CONFIG,
    );
    return { rows: docs.map(toFlagPub), total, page, page_size };
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
    invalidateFeatureFlagCache();
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
    invalidateFeatureFlagCache();
    return toFlagPub(updated);
  },

  async setFlagEnabled(id: string, enabled: boolean) {
    const updated = await FeatureFlagModel.findByIdAndUpdate(
      id,
      { enabled },
      { new: true },
    );
    if (!updated) notFound("FeatureFlag");
    invalidateFeatureFlagCache();
    return toFlagPub(updated);
  },

  /**
   * Restore flags from an exported file. Matching is on key because an export
   * exists to be carried between environments, where the ids of the machine it
   * came from mean nothing.
   *
   * A key this server already has is updated in place — including a system
   * flag, whose key is seeded on boot and whose enabled state is exactly what
   * an operator is moving.
   */
  async importFlags(
    flags: Array<{
      key: string;
      name: string;
      description?: string | null;
      enabled?: boolean | null;
    }>,
  ) {
    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];

    for (const flag of flags) {
      const key = flag.key.toLowerCase().trim();
      const name = flag.name.trim();
      if (!key || !name) {
        skipped.push(flag.key || "(no key)");
        continue;
      }
      const existing = await FeatureFlagModel.findOne({ key });
      const input = {
        name,
        description: flag.description ?? "",
        enabled: !!flag.enabled,
      };
      if (existing) {
        await this.updateFlag(existing.id, input);
        updated.push(key);
      } else {
        await this.createFlag({ ...input, key });
        created.push(key);
      }
    }

    return { created, updated, skipped };
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
    invalidateFeatureFlagCache();
    return true;
  },

  async getBranding() {
    let doc = await BrandingModel.findOne({ singleton_key: "branding" });
    if (!doc) doc = await BrandingModel.create({ singleton_key: "branding" });
    return brandingToPub(doc);
  },

  /** Public app-version info for the mobile force-update gate. */
  async getAppVersionInfo() {
    const b = await this.getBranding();
    return {
      latest_version: b.app_latest_version ?? "",
      // Never falls back to app_latest_version: that is auto-synced on every
      // deploy, so defaulting to it would re-create the very lockout this
      // field exists to prevent. Blank blocks nobody.
      min_supported_version: b.app_min_supported_version ?? "",
      android_store_url: b.android_app_url || DEFAULT_ANDROID_STORE_URL,
      ios_store_url: b.ios_app_url ?? "",
    };
  },

  /**
   * Sync the DB's latest app version from the APP_VERSION env (set by the
   * deploy workflow from app/mobile-app/app.json) on every boot — this is how
   * "the version updates in the database on every push". No-op when the env is
   * unset or already matches, so it is safe to run each boot.
   */
  async applyEnvVersion() {
    const version = (process.env.APP_VERSION ?? "").trim();
    if (!version) return;
    await BrandingModel.updateOne(
      { singleton_key: "branding" },
      { $set: { app_latest_version: version } },
      { upsert: true },
    );
  },

  async updateBranding(
    input: Partial<Record<BrandingField, string>> & {
      home_all_vibe_icon_layout?: {
        position?: string | null;
        width?: number | null;
        height?: number | null;
      } | null;
      home_show_all_vibe_categories?: boolean;
      login_background_image_enabled?: boolean;
      login_background_video_enabled?: boolean;
    },
  ) {
    const update: any = {};
    for (const k of BRANDING_FIELDS) {
      if (input[k] !== undefined) update[k] = input[k];
    }
    // The "All" tab icon layout is an object, not a plain string field — normalise
    // it (default position, clamp size) before storing; null clears it.
    if (input.home_all_vibe_icon_layout !== undefined) {
      update.home_all_vibe_icon_layout = normalizeVibeIconLayout(input.home_all_vibe_icon_layout);
    }
    // Boolean toggle can't ride the string-typed BRANDING_FIELDS loop.
    if (input.home_show_all_vibe_categories !== undefined) {
      update.home_show_all_vibe_categories = !!input.home_show_all_vibe_categories;
    }
    // Same reason: the two login-backdrop switches are Booleans, and a URL
    // saved without its switch would be an asset that never draws.
    if (input.login_background_image_enabled !== undefined) {
      update.login_background_image_enabled = !!input.login_background_image_enabled;
    }
    if (input.login_background_video_enabled !== undefined) {
      update.login_background_video_enabled = !!input.login_background_video_enabled;
    }
    const doc = await BrandingModel.findOneAndUpdate(
      { singleton_key: "branding" },
      { $set: update },
      { new: true, upsert: true },
    );
    return brandingToPub(doc);
  },

  /** Replace the global Pod Shop slider media (products portal). Normalises the
   * media type and backfills the display order from array position. */
  async updatePodShopSlider(
    input: {
      url: string;
      type?: string;
      order?: number;
      heading?: string | null;
      subheading?: string | null;
      cta_label?: string | null;
      cta_url?: string | null;
    }[],
  ) {
    const media = (input ?? []).map((m, i) => ({
      url: m.url,
      type: m.type === "VIDEO" ? "VIDEO" : "IMAGE",
      order: m.order ?? i,
      heading: (m.heading ?? "").trim(),
      subheading: (m.subheading ?? "").trim(),
      cta_label: (m.cta_label ?? "").trim(),
      cta_url: (m.cta_url ?? "").trim(),
    }));
    const doc = await BrandingModel.findOneAndUpdate(
      { singleton_key: "branding" },
      { $set: { pod_shop_slider: media } },
      { new: true, upsert: true },
    );
    return brandingToPub(doc).pod_shop_slider;
  },

  /** Replace the festive icon windows (admin Branding). Rows with an unusable
   * slug or date range are dropped rather than stored half-formed. */
  async updateOccasionalIcons(
    input: {
      slug: string;
      label?: string | null;
      starts_at: string;
      ends_at: string;
      icon_url?: string | null;
      fallback_icon?: string | null;
      is_active?: boolean | null;
      sort_order?: number | null;
    }[],
  ) {
    const rows = (input ?? [])
      .map((o, i) => ({
        slug: (o.slug ?? "").trim().toLowerCase(),
        label: (o.label ?? "").trim(),
        starts_at: new Date(o.starts_at),
        ends_at: new Date(o.ends_at),
        icon_url: (o.icon_url ?? "").trim(),
        // Stored as-is: the canonical name list lives in @duncit/fallback-icons,
        // which the server cannot import, and a second copy here would drift. The
        // admin Select constrains the choice; clients resolve an unknown name to
        // their own default rather than rendering nothing.
        fallback_icon: (o.fallback_icon ?? "").trim().toLowerCase(),
        is_active: o.is_active !== false,
        sort_order: o.sort_order ?? i,
      }))
      .filter(
        (o) =>
          o.slug !== "" &&
          !Number.isNaN(o.starts_at.getTime()) &&
          !Number.isNaN(o.ends_at.getTime()) &&
          o.ends_at.getTime() >= o.starts_at.getTime(),
      );
    const doc = await BrandingModel.findOneAndUpdate(
      { singleton_key: "branding" },
      { $set: { occasional_icons: rows } },
      { new: true, upsert: true },
    );
    return brandingToPub(doc).occasional_icons;
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
          // `is_system` is $set, not $setOnInsert: a key in this catalogue is a
          // system flag even when the row already exists because an operator
          // created it by hand before the feature shipped. Left insert-only it
          // stayed `false` forever on exactly those servers, and the flag that
          // gates a whole feature stayed deletable from the Admin table.
          $set: { is_system: true },
          // `enabled`, `name` and `description` stay insert-only — the seed
          // names a default, never the switch position an operator chose.
          $setOnInsert: {
            key: f.key,
            name: f.name,
            description: f.description,
            enabled: f.enabled,
          },
        },
        { upsert: true },
      );
    }
    invalidateFeatureFlagCache();
  },
};
