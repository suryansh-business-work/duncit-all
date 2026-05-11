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
    publicWebsiteContent(type: WebsitePageType!): [WebsiteContentItem!]!
  }

  extend type Mutation {
    createWebsiteContent(input: WebsiteContentInput!): WebsiteContentItem!
    updateWebsiteContent(content_id: ID!, input: WebsiteContentInput!): WebsiteContentItem!
    deleteWebsiteContent(content_id: ID!): Boolean!
  }
`;