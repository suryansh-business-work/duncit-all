export const websiteContentTypeDefs = /* GraphQL */ `
  enum WebsitePageType {
    CAREERS
    NEWSROOM
    BLOG
    "An offering on duncit.com/solutions, filed under an audience and a category."
    SOLUTIONS
  }

  "Who a SOLUTIONS entry is offered to — the sections duncit.com/solutions lists."
  enum SolutionAudience {
    VENUE
    HOST
    CLUB_ADMIN
    CREATOR
    COMMUNITY
  }

  type WebsiteContentItem {
    id: ID!
    type: WebsitePageType!
    title: String!
    slug: String!
    summary: String!
    body: String!
    category: String!
    image_url: String!
    cta_label: String!
    cta_url: String!
    published_at: String
    is_published: Boolean!
    sort_order: Int!
    "SOLUTIONS only; null on every other type."
    audience: SolutionAudience
    "SOLUTIONS only: announced, not on sale yet."
    coming_soon: Boolean!
    "The category as a URL segment: a solution lives at /solutions/<category_slug>/<slug>."
    category_slug: String!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (websiteContentTable)."
  type WebsiteContentItemTablePage {
    rows: [WebsiteContentItem!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input WebsiteContentInput {
    type: WebsitePageType!
    title: String!
    slug: String
    summary: String
    body: String
    category: String
    image_url: String
    cta_label: String
    cta_url: String
    published_at: String
    is_published: Boolean
    sort_order: Int
    "Required for SOLUTIONS, must be empty otherwise."
    audience: SolutionAudience
    coming_soon: Boolean
  }

  extend type Query {
    websiteContent(type: WebsitePageType): [WebsiteContentItem!]!
    websiteContentTable(query: TableQueryInput): WebsiteContentItemTablePage!
    publicWebsiteContent(type: WebsitePageType!): [WebsiteContentItem!]!
  }

  extend type Mutation {
    createWebsiteContent(input: WebsiteContentInput!): WebsiteContentItem!
    updateWebsiteContent(content_id: ID!, input: WebsiteContentInput!): WebsiteContentItem!
    deleteWebsiteContent(content_id: ID!): Boolean!
  }
`;