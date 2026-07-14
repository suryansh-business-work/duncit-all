import gql from "graphql-tag";

export const settingsTypeDefs = gql`
  type AppSettings {
    jwt_expires_in: String
    jwt_no_expiry: Boolean!
    date_format: String!
    time_format: String!
    "IANA timezone (e.g. Asia/Kolkata) used to display all dates & times."
    time_zone: String!
    updated_at: String
  }

  type PublicAppSettings {
    date_format: String!
    time_format: String!
    "IANA timezone (e.g. Asia/Kolkata) used to display all dates & times."
    time_zone: String!
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

  type Branding {
    app_name: String!
    logo_url: String!
    primary_color: String!
    support_email: String!
    support_phone: String!
    mascot_name: String!
    mascot_description_html: String!
    mascot_image_url: String!
    mascot_lottie_url: String!
    mascot_on_chair_lottie_url: String!
    mascot_winner_lottie_url: String!
    welcome_lottie_url: String!
    app_loader_lottie_url: String!
    confetti_lottie_url: String!
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
    website_header_logo_url: String!
    website_footer_logo_url: String!
    website_favicon_url: String!
    android_app_url: String!
    ios_app_url: String!
    home_all_vibe_icon_url: String!
    home_header_tagline: String!
    app_latest_version: String!
    updated_at: String
  }

  type AppVersionInfo {
    latest_version: String!
    android_store_url: String!
    ios_store_url: String!
  }

  input UpdateBrandingInput {
    app_name: String
    logo_url: String
    primary_color: String
    support_email: String
    support_phone: String
    mascot_name: String
    mascot_description_html: String
    mascot_image_url: String
    mascot_lottie_url: String
    mascot_on_chair_lottie_url: String
    mascot_winner_lottie_url: String
    welcome_lottie_url: String
    app_loader_lottie_url: String
    confetti_lottie_url: String
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
    website_header_logo_url: String
    website_footer_logo_url: String
    website_favicon_url: String
    android_app_url: String
    ios_app_url: String
    home_all_vibe_icon_url: String
    home_header_tagline: String
    app_latest_version: String
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
    updateBranding(input: UpdateBrandingInput!): Branding!
  }
`;
