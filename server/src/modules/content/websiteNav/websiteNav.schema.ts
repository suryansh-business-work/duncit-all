export const websiteNavTypeDefs = /* GraphQL */ `
  enum WebsiteNavSite {
    MAIN
    PARTNERS
    ADS
    EARNWITH
  }

  enum WebsiteNavArea {
    HEADER
    FOOTER
  }

  "A marketing-website navigation link, managed from the Website portal."
  type WebsiteNavItem {
    id: ID!
    site: WebsiteNavSite!
    area: WebsiteNavArea!
    group_label: String!
    label: String!
    url: String!
    sort_order: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (websiteNavTable)."
  type WebsiteNavItemTablePage {
    rows: [WebsiteNavItem!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input WebsiteNavItemInput {
    site: WebsiteNavSite!
    area: WebsiteNavArea!
    group_label: String
    label: String!
    url: String!
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    "Public: a site's active navigation, ordered by group + sort order."
    publicWebsiteNav(site: WebsiteNavSite!): [WebsiteNavItem!]!
    websiteNav(site: WebsiteNavSite): [WebsiteNavItem!]!
    websiteNavTable(query: TableQueryInput): WebsiteNavItemTablePage!
  }

  extend type Mutation {
    createWebsiteNavItem(input: WebsiteNavItemInput!): WebsiteNavItem!
    updateWebsiteNavItem(item_id: ID!, input: WebsiteNavItemInput!): WebsiteNavItem!
    deleteWebsiteNavItem(item_id: ID!): Boolean!
  }
`;
