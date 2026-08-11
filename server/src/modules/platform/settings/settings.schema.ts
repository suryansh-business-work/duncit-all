import gql from "graphql-tag";

export const settingsTypeDefs = gql`
  "Where every app reads the current time from."
  enum TimeSource {
    "The server's clock — the default, keeps every device in step."
    SERVER
    "Each device's own clock."
    BROWSER
    "A fixed anchor set by an admin; the clock runs forward from there."
    CUSTOM
  }

  type AppSettings {
    jwt_expires_in: String
    jwt_no_expiry: Boolean!
    date_format: String!
    time_format: String!
    "IANA timezone (e.g. Asia/Kolkata) used to display all dates & times."
    time_zone: String!
    "Where every app reads 'now' from: SERVER, BROWSER or CUSTOM."
    time_source: TimeSource!
    "CUSTOM anchor — the instant the apps' clock should read (ISO)."
    custom_time: String
    "Server's real time when the CUSTOM anchor was saved (ISO)."
    custom_time_set_at: String
    "Minimum age (whole years) required to sign up or save a date of birth."
    min_signup_age: Int!
    "Days a Create-Pod draft is kept (from last save) before auto-deletion."
    draft_retention_days: Int!
    "Max Backout attempts a user gets per pod (each 'Backout in process' counts one)."
    max_backout_attempts: Int!
    "Account Health points deducted from a venue when its owner cancels a pod booked there (0 disables the penalty)."
    venue_cancel_health_penalty: Int!
    "Percent of every successful payment granted back to the buyer as Duncit Coins, where 1 coin = 1 rupee (0 turns the reward off)."
    coin_earn_pct: Int!
    updated_at: String
  }

  type PublicAppSettings {
    date_format: String!
    time_format: String!
    "IANA timezone (e.g. Asia/Kolkata) used to display all dates & times."
    time_zone: String!
    "Where every app reads 'now' from: SERVER, BROWSER or CUSTOM."
    time_source: TimeSource!
    "CUSTOM anchor — the instant the apps' clock should read (ISO)."
    custom_time: String
    "Server's real time when the CUSTOM anchor was saved (ISO)."
    custom_time_set_at: String
    "The server's clock at the moment this response was built (ISO). Clients add their own elapsed time to keep it ticking."
    server_time: String!
    "Minimum age (whole years) required to sign up or save a date of birth."
    min_signup_age: Int!
    "Days a Create-Pod draft is kept (from last save) before auto-deletion."
    draft_retention_days: Int!
    "Max Backout attempts a user gets per pod (each 'Backout in process' counts one)."
    max_backout_attempts: Int!
    "Account Health points deducted from a venue when its owner cancels a pod booked there (0 disables the penalty)."
    venue_cancel_health_penalty: Int!
  }

  type PublicClientConfig {
    google_client_id: String!
    google_maps_api_key: String!
  }

  input UpdateAppSettingsInput {
    jwt_expires_in: String
    jwt_no_expiry: Boolean
    date_format: String
    time_format: String
    time_zone: String
    time_source: TimeSource
    "CUSTOM anchor (ISO). Saving it stamps custom_time_set_at server-side."
    custom_time: String
    "Minimum age to use the app, in whole years (1-120)."
    min_signup_age: Int
    "Days a Create-Pod draft is kept before auto-deletion (min 1)."
    draft_retention_days: Int
    "Max Backout attempts a user gets per pod (min 1)."
    max_backout_attempts: Int
    "Account Health points deducted from a venue when its owner cancels a pod booked there (0-100, 0 disables the penalty)."
    venue_cancel_health_penalty: Int
    "Percent of every successful payment granted back as Duncit Coins (0-100, 0 turns the reward off)."
    coin_earn_pct: Int
  }

  type FeatureFlag {
    id: ID!
    key: String!
    name: String!
    description: String
    enabled: Boolean!
    is_system: Boolean!
    created_at: String
    updated_at: String
  }

  type PublicFeatureFlag {
    key: String!
    enabled: Boolean!
  }

  "Server-side table page for the shared table engine (featureFlagsTable)."
  type FeatureFlagTablePage {
    rows: [FeatureFlag!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateFeatureFlagInput {
    key: String!
    name: String!
    description: String
    enabled: Boolean
  }

  input UpdateFeatureFlagInput {
    name: String
    description: String
    enabled: Boolean
  }

  """
  One flag from an exported JSON file. There is no id: an export is moved
  BETWEEN environments, where ids mean nothing, so a flag is matched on the
  thing that names it — its key.
  """
  input ImportFeatureFlagInput {
    key: String!
    name: String!
    description: String
    enabled: Boolean
  }

  """
  What an import did. Flags are reported by key so an operator can see which
  features the file switched, and skipped keys say what the file asked for
  that could not be applied (a flag with no key or no name).
  """
  type FeatureFlagImportResult {
    created: [String!]!
    updated: [String!]!
    skipped: [String!]!
  }

  """
  A festive window. While the app clock sits inside [starts_at, ends_at] the
  apps swap in this occasion's icons. The slug doubles as the folder name the
  native app loads its pre-bundled icons from.
  """
  type OccasionalIcon {
    slug: String!
    label: String!
    starts_at: String!
    ends_at: String!
    "Server-hosted icon. Native prefers its bundled copy for this slug."
    icon_url: String!
    """
    Which bundled fallback-icon NAME renders when icon_url is blank or fails
    to load — one of @duncit/fallback-icons FALLBACK_ICON_NAMES.
    """
    fallback_icon: String!
    is_active: Boolean!
    "Higher wins when windows overlap, so a campaign can sit over a season."
    sort_order: Int!
  }

  input OccasionalIconInput {
    slug: String!
    label: String
    starts_at: String!
    ends_at: String!
    icon_url: String
    fallback_icon: String
    is_active: Boolean
    sort_order: Int
  }

  "One media item in the global Pod Shop top slider (image or video)."
  type PodShopSliderMedia {
    url: String!
    type: CategoryMediaType!
    order: Int!
    "Optional overlay copy + call-to-action shown on the Pod Shop hero slide."
    heading: String!
    subheading: String!
    cta_label: String!
    cta_url: String!
  }

  input PodShopSliderMediaInput {
    url: String!
    type: CategoryMediaType
    order: Int
    heading: String
    subheading: String
    cta_label: String
    cta_url: String
  }

  type Branding {
    app_name: String!
    logo_url: String!
    primary_color: String!
    support_email: String!
    support_phone: String!
    mweb_favicon_url: String!
    mweb_logo_url: String!
    mweb_splash_url: String!
    mweb_splash_type: String!
    mobile_favicon_url: String!
    mobile_logo_url: String!
    mobile_splash_url: String!
    mobile_splash_type: String!
    portals_favicon_url: String!
    portals_logo_url: String!
    portals_splash_url: String!
    portals_splash_type: String!
    venues_card_video_url: String!
    mobile_font_family: String!
    mweb_font_family: String!
    portals_font_family: String!
    website_header_logo_url: String!
    website_footer_logo_url: String!
    website_favicon_url: String!
    android_app_url: String!
    ios_app_url: String!
    home_all_vibe_icon_url: String!
    "Icon placement + size for the home All tab (null means the default TOP 40x40 look)."
    home_all_vibe_icon_layout: CategoryIconLayout
    "When true, the home vibe tabber shows every category (even ones with no pods); false shows only categories that have pods."
    home_show_all_vibe_categories: Boolean!
    "Heading over the home vibe (category) filter; empty falls back to each client's bundled copy."
    home_vibe_heading: String!
    "Sub-heading under the vibe heading; empty falls back to each client's bundled copy."
    home_vibe_subheading: String!
    home_header_tagline: String!
    app_latest_version: String!
    """
    Oldest mobile build still allowed in. Set by hand once a release is live in
    the stores — unlike app_latest_version, which moves on every deploy. Blank
    means nothing is blocked.
    """
    app_min_supported_version: String!
    "Global Pod Shop top slider — admin-managed image/video media (products portal)."
    pod_shop_slider: [PodShopSliderMedia!]!
    "Festive icon windows; the app clock picks which one is active."
    occasional_icons: [OccasionalIcon!]!
    updated_at: String
  }

  type AppVersionInfo {
    "Newest released version. Moves on every deploy — informational only."
    latest_version: String!
    """
    Oldest build still allowed in; what the force-update gate compares against.
    Blank means nothing is blocked, which is the state a fresh database is in.
    """
    min_supported_version: String!
    android_store_url: String!
    ios_store_url: String!
  }

  input UpdateBrandingInput {
    app_name: String
    logo_url: String
    primary_color: String
    support_email: String
    support_phone: String
    mweb_favicon_url: String
    mweb_logo_url: String
    mweb_splash_url: String
    mweb_splash_type: String
    mobile_favicon_url: String
    mobile_logo_url: String
    mobile_splash_url: String
    mobile_splash_type: String
    portals_favicon_url: String
    portals_logo_url: String
    portals_splash_url: String
    portals_splash_type: String
    venues_card_video_url: String
    mobile_font_family: String
    mweb_font_family: String
    portals_font_family: String
    website_header_logo_url: String
    website_footer_logo_url: String
    website_favicon_url: String
    android_app_url: String
    ios_app_url: String
    home_all_vibe_icon_url: String
    home_all_vibe_icon_layout: CategoryIconLayoutInput
    home_show_all_vibe_categories: Boolean
    home_vibe_heading: String
    home_vibe_subheading: String
    home_header_tagline: String
    app_latest_version: String
    app_min_supported_version: String
  }

  extend type Query {
    appSettings: AppSettings!
    publicAppSettings: PublicAppSettings!
    publicClientConfig: PublicClientConfig!
    featureFlags: [FeatureFlag!]!
    featureFlagsTable(query: TableQueryInput): FeatureFlagTablePage!
    featureFlag(key: String!): FeatureFlag
    publicFeatureFlags: [PublicFeatureFlag!]!
    branding: Branding!
    appVersionInfo: AppVersionInfo!
  }

  extend type Mutation {
    updateAppSettings(input: UpdateAppSettingsInput!): AppSettings!
    createFeatureFlag(input: CreateFeatureFlagInput!): FeatureFlag!
    updateFeatureFlag(
      flag_id: ID!
      input: UpdateFeatureFlagInput!
    ): FeatureFlag!
    setFeatureFlag(flag_id: ID!, enabled: Boolean!): FeatureFlag!
    deleteFeatureFlag(flag_id: ID!): Boolean!

    """
    Restore flags from an exported JSON file, matching on key: a key this
    server already has is switched to the file's state, a new one is created.

    System flags are updated like any other — their key is seeded on boot, so
    the file only carries whether the feature is on, never the seeding itself.
    """
    importFeatureFlags(
      flags: [ImportFeatureFlagInput!]!
    ): FeatureFlagImportResult!
    updateBranding(input: UpdateBrandingInput!): Branding!
    "Replace the global Pod Shop slider media (managed from the products portal)."
    updatePodShopSlider(input: [PodShopSliderMediaInput!]!): [PodShopSliderMedia!]!
    "Replace the occasional-icon windows (admin Branding)."
    updateOccasionalIcons(input: [OccasionalIconInput!]!): [OccasionalIcon!]!
  }
`;
