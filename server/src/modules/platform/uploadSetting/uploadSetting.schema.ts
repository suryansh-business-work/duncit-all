export const uploadSettingTypeDefs = /* GraphQL */ `
  enum UploadSurface {
    PORTALS
    MOBILE_MWEB
  }

  type UploadCropPreset {
    key: String!
    label: String!
    "Target output resolution; 0×0 = keep the source resolution (No Crop)."
    width: Int!
    height: Int!
    enabled: Boolean!
  }

  type UploadSetting {
    id: ID!
    surface: UploadSurface!
    max_image_mb: Int!
    max_video_mb: Int!
    allowed_image_formats: [String!]!
    allowed_video_formats: [String!]!
    image_compression_enabled: Boolean!
    image_quality: Int!
    image_max_dimension: Int!
    video_compression_enabled: Boolean!
    video_crf: Int!
    video_max_height: Int!
    ai_image_monitoring_enabled: Boolean!
    default_crop_key: String!
    crop_presets: [UploadCropPreset!]!
    updated_at: String
  }

  input UploadCropPresetInput {
    key: String!
    label: String
    width: Int
    height: Int
    enabled: Boolean
  }

  input UpdateUploadSettingInput {
    max_image_mb: Int
    max_video_mb: Int
    allowed_image_formats: [String!]
    allowed_video_formats: [String!]
    image_compression_enabled: Boolean
    image_quality: Int
    image_max_dimension: Int
    video_compression_enabled: Boolean
    video_crf: Int
    video_max_height: Int
    ai_image_monitoring_enabled: Boolean
    default_crop_key: String
    crop_presets: [UploadCropPresetInput!]
  }

  type MediaScanLog {
    id: ID!
    url: String!
    file_name: String!
    folder: String!
    surface: String!
    user_id: String
    risk: String!
    summary: String!
    created_at: String!
  }

  type MediaScanLogsTableResult {
    rows: [MediaScanLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Upload rules for the calling client's surface (any signed-in user)."
    uploadSettings(surface: UploadSurface!): UploadSetting!
    "Admin: both surfaces for the Upload Settings pages."
    allUploadSettings: [UploadSetting!]!
    "Admin: AI image-monitoring scan log (server-side table)."
    mediaScanLogsTable(query: TableQueryInput): MediaScanLogsTableResult!
  }

  extend type Mutation {
    updateUploadSettings(surface: UploadSurface!, input: UpdateUploadSettingInput!): UploadSetting!
  }
`;
