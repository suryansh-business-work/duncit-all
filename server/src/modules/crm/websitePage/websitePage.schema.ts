import gql from 'graphql-tag';

export const websitePageTypeDefs = gql`
  "A page discovered from a CRM lead's website (with optional fetched content)."
  type CrmWebsitePage {
    id: ID!
    entity_type: CrmEntityType!
    lead_id: ID!
    url: String!
    title: String
    status: CrmWebsitePageStatus!
    http_status: Int
    content_text: String
    content_chars: Int!
    error: String
    fetched_at: String
    created_at: String
    updated_at: String
  }

  enum CrmWebsitePageStatus {
    DISCOVERED
    FETCHED
    ERROR
  }

  type CrmWebsiteScrapeResult {
    discovered: Int!
    saved: Int!
    pages: [CrmWebsitePage!]!
  }

  extend type Query {
    crmWebsitePages(entity_type: CrmEntityType!, lead_id: ID!): [CrmWebsitePage!]!
  }

  extend type Mutation {
    "Discover up to \`limit\` pages from the lead's website and save them."
    crmScrapeWebsitePages(entity_type: CrmEntityType!, lead_id: ID!, limit: Int!): CrmWebsiteScrapeResult!
    "Fetch + extract readable content for a single discovered page."
    crmFetchWebsitePageContent(id: ID!): CrmWebsitePage!
    crmDeleteWebsitePage(id: ID!): Boolean!
  }
`;
