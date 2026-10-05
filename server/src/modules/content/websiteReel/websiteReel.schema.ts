export const websiteReelTypeDefs = /* GraphQL */ `
  "A reel in a marketing website's home-page Reel Slider, managed from the Website portal."
  type WebsiteReel {
    id: ID!
    site: WebsiteNavSite!
    title: String!
    description: String!
    video_url: String!
    file_size_bytes: Float!
    sort_order: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (websiteReelsTable)."
  type WebsiteReelTablePage {
    rows: [WebsiteReel!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input WebsiteReelInput {
    site: WebsiteNavSite!
    title: String
    description: String
    video_url: String!
    file_size_bytes: Float
    sort_order: Int
    is_active: Boolean
  }

  "Reel Slider limits shared by every website."
  type WebsiteReelSettings {
    max_reel_mb: Int!
    max_reels: Int!
    updated_at: String!
  }

  input WebsiteReelSettingsInput {
    max_reel_mb: Int
    max_reels: Int
  }

  extend type Query {
    "Public: a site's active reels in slider order, capped at the max reels setting."
    publicWebsiteReels(site: WebsiteNavSite!): [WebsiteReel!]!
    websiteReelsTable(query: TableQueryInput): WebsiteReelTablePage!
    websiteReelSettings: WebsiteReelSettings!
  }

  extend type Mutation {
    createWebsiteReel(input: WebsiteReelInput!): WebsiteReel!
    updateWebsiteReel(reel_id: ID!, input: WebsiteReelInput!): WebsiteReel!
    deleteWebsiteReel(reel_id: ID!): Boolean!
    updateWebsiteReelSettings(input: WebsiteReelSettingsInput!): WebsiteReelSettings!
  }
`;
