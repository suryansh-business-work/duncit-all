import gql from 'graphql-tag';

/**
 * The AI Library's per-prompt surface: the detail view, its quality review,
 * version history, public sharing, archiving and interaction analytics. Kept
 * beside `aiPromptTypeDefs` rather than inside it so the list/CRUD contract and
 * this one can change independently.
 */
export const aiPromptLibraryTypeDefs = gql`
  "ChatGPT's review of a prompt against the library.prompt_quality rubric."
  type AiPromptQuality {
    "0-100."
    score: Int!
    summary: String!
    strengths: [String!]!
    improvements: [String!]!
    "Model that wrote the review."
    model: String!
    scored_at: String!
    "True when the prompt's body has changed since this review."
    stale: Boolean!
  }

  "A prompt's public share link. The page lives on the AI portal at /p/<token>."
  type AiPromptShare {
    enabled: Boolean!
    "Kept while sharing is off, so switching it back on restores the same link."
    token: String
    shared_at: String
    shared_by_name: String
  }

  enum AiPromptChange {
    "The state a prompt was in when history began."
    BASELINE
    CREATE
    "A person changed it."
    UPDATE
    "The server changed it on boot."
    SEED
  }

  "One saved state of a prompt. A snapshot, so it reads the same after later edits."
  type AiPromptVersion {
    version: Int!
    change: AiPromptChange!
    changed_fields: [String!]!
    name: String!
    description: String!
    content: String!
    category: String!
    target_model: String!
    is_active: Boolean!
    token_count: Int!
    edited_by_name: String
    created_at: String
  }

  "Everything the library's detail view shows about one prompt."
  type AiPromptDetail {
    prompt: AiPrompt!
    archived_at: String
    archived_by_name: String
    "Null until the prompt has been reviewed once."
    quality: AiPromptQuality
    share: AiPromptShare!
    "Every recorded interaction, all time."
    total_hits: Int!
    last_hit_at: String
    "Newest first, up to 50."
    versions: [AiPromptVersion!]!
  }

  enum AiPromptEventType {
    DETAIL_VIEW
    QUICK_VIEW
    COPY_PROMPT
    COPY_LINK
    PUBLIC_VIEW
    OPEN_IN_PLATFORM
    COPY_SCRIPT
    FEED_HIT
  }

  enum AiPromptPlatform {
    CLAUDE
    CHATGPT
    GROK
    PERPLEXITY
  }

  type AiPromptCount {
    key: String!
    count: Int!
  }

  "Hits on one day, in the admin-configured time zone (YYYY-MM-DD)."
  type AiPromptDayCount {
    day: String!
    count: Int!
  }

  "Interactions with one prompt over a range (default 30 days, max 365)."
  type AiPromptAnalytics {
    range_days: Int!
    total_hits: Int!
    "Distinct browsers on the public page plus distinct signed-in staff."
    unique_visitors: Int!
    by_type: [AiPromptCount!]!
    by_platform: [AiPromptCount!]!
    "utm_source, else the referrer's host, else direct; portal hits count as portal. Top 10."
    by_source: [AiPromptCount!]!
    by_device: [AiPromptCount!]!
    by_day: [AiPromptDayCount!]!
  }

  extend type Query {
    aiPromptDetail(id: ID!): AiPromptDetail
    aiPromptAnalytics(id: ID!, range_days: Int): AiPromptAnalytics!
  }

  extend type Mutation {
    "Review a prompt with ChatGPT. Returns the stored review while the body is unchanged, unless force is true."
    scoreAiPrompt(id: ID!, force: Boolean): AiPromptQuality!
    "Archive an AI prompt (code prompts are refused). It leaves the tabs, the feed and its public link."
    archiveAiPrompt(id: ID!): AiPromptDetail!
    unarchiveAiPrompt(id: ID!): AiPromptDetail!
    "Turn the public link on. regenerate mints a new token and kills the old link."
    enableAiPromptPublicShare(id: ID!, regenerate: Boolean): AiPromptShare!
    disableAiPromptPublicShare(id: ID!): AiPromptShare!
    "Copy an earlier version back. Recorded as a new version."
    restoreAiPromptVersion(id: ID!, version: Int!): AiPrompt!
    "Record a portal interaction (a view, a copy, a script copy) for the prompt's analytics."
    recordAiPromptEvent(id: ID!, type: AiPromptEventType!, platform: AiPromptPlatform): Boolean!
  }
`;
