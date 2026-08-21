export const aiMonitoringTypeDefs = /* GraphQL */ `
  """
  The AI Monitoring chip/dialog copy every upload surface renders.
  A null field means "no override" — the surface renders its own localized
  fallback, so untouched copy still follows the reader's language.
  """
  type AiMonitoringConfig {
    "Master switch for the chip. Off hides it everywhere; scans still log."
    chip_enabled: Boolean!
    chip_label: String
    dialog_title: String
    dialog_intro: String
    dialog_points: [String!]!
    dialog_footnote: String
    dismiss_label: String
  }

  "The config plus the prompt the image check runs on (AI Portal > Settings)."
  type AiMonitoringSettings {
    chip_enabled: Boolean!
    chip_label: String
    dialog_title: String
    dialog_intro: String
    dialog_points: [String!]!
    dialog_footnote: String
    dismiss_label: String
    "Live body of the system prompt that analyses every uploaded image."
    image_prompt: String!
    "Its row in the AI Prompt Library — the same prompt, one store."
    image_prompt_id: ID
    image_prompt_key: String!
    image_scan_model: String!
  }

  input UpdateAiMonitoringSettingsInput {
    chip_enabled: Boolean
    chip_label: String
    dialog_title: String
    dialog_intro: String
    dialog_points: [String!]
    dialog_footnote: String
    dismiss_label: String
    "Replaces the body of the upload.image_scan system prompt."
    image_prompt: String
  }

  "One AI monitoring check — every image the platform screened, and what came of it."
  type AiMonitoringLog {
    id: ID!
    "Uploaded image."
    url: String!
    file_name: String!
    "Upload folder — the Source/Module the image came from."
    folder: String!
    "Client family the upload came from: PORTALS, MOBILE or MWEB."
    surface: String!
    user_id: String
    "User/Entity that uploaded it, resolved to a display name."
    entity: String
    "AI Result: PENDING, LOW, MEDIUM or HIGH."
    risk: String!
    "Monitoring Status: PENDING, COMPLETED, FAILED or SKIPPED."
    status: String!
    "Action Taken: NONE, ALLOWED, FLAGGED or BLOCKED."
    action: String!
    "Reason/Comment — the model's one-line explanation, or why it never ran."
    summary: String!
    model: String!
    duration_ms: Int!
    "Failure detail when the check did not complete."
    error: String!
    checked_at: String
    "Upload date and time."
    created_at: String!
  }

  type AiMonitoringLogsTableResult {
    rows: [AiMonitoringLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Chip/dialog copy for any upload surface. Public — it is copy, and an upload field must never wait on a session to render its own safety notice."
    aiMonitoringConfig: AiMonitoringConfig!
    "AI Portal: the copy plus the image-analysis prompt."
    aiMonitoringSettings: AiMonitoringSettings!
    "AI Portal: full monitoring history (server-side table)."
    aiMonitoringLogsTable(query: TableQueryInput): AiMonitoringLogsTableResult!
  }

  extend type Mutation {
    "AI Portal: save the chip/dialog copy and the image-analysis prompt."
    updateAiMonitoringSettings(input: UpdateAiMonitoringSettingsInput!): AiMonitoringSettings!
  }
`;
