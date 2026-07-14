export const websiteContentTypeDefs = /* GraphQL */ `
  enum WebsitePageType {
    CAREERS
    NEWSROOM
    BLOG
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