export const apiKeyTypeDefs = /* GraphQL */ `
  "A developer API key for the public venue REST API. Only a hash is stored."
  type ApiKey {
    id: ID!
    name: String!
    "First characters of the raw key, for display — the full key is never stored."
    key_prefix: String!
    owner_user_id: ID!
    scopes: [String!]!
    last_used_at: String
    revoked_at: String
    created_at: String!
  }

  type CreatedApiKey {
    api_key: ApiKey!
    "The full key — shown exactly once at creation; it cannot be recovered later."
    raw_key: String!
  }

  "Server-side table page for the shared table engine (myApiKeysTable)."
  type ApiKeyTablePage {
    rows: [ApiKey!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    myApiKeys: [ApiKey!]!
    myApiKeysTable(query: TableQueryInput): ApiKeyTablePage!
  }

  extend type Mutation {
    createApiKey(name: String!): CreatedApiKey!
    revokeApiKey(id: ID!): ApiKey!
  }
`;
