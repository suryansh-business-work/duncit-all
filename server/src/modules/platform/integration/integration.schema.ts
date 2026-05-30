import gql from 'graphql-tag';

export const integrationTypeDefs = gql`
  enum IntegrationProviderType {
    IMAGEKIT
    PEXELS
    GOOGLE
    TWILIO
    AI
  }

  """
  Shared config for every integration type. Each type reads only the keys it
  needs (ImageKit: public_key/private_key/url_endpoint; Pexels: api_key;
  Google: client_id/client_secret/maps_api_key; Twilio: account_sid/auth_token/
  phone_number; AI: provider/api_key/base_url/model). Secrets are never returned
  — only the matching has_* boolean is exposed.
  """
  type IntegrationProviderConfig {
    public_key: String
    url_endpoint: String
    client_id: String
    account_sid: String
    phone_number: String
    base_url: String
    model: String
    provider: String

    has_private_key: Boolean!
    has_api_key: Boolean!
    has_client_secret: Boolean!
    has_maps_api_key: Boolean!
    has_auth_token: Boolean!
  }

  type IntegrationProvider {
    id: ID!
    name: String!
    type: IntegrationProviderType!
    description: String
    is_default: Boolean!
    is_active: Boolean!
    config: IntegrationProviderConfig!
    last_used_at: String
    created_at: String
    updated_at: String
  }

  input IntegrationProviderConfigInput {
    public_key: String
    private_key: String
    url_endpoint: String
    api_key: String
    client_id: String
    client_secret: String
    maps_api_key: String
    account_sid: String
    auth_token: String
    phone_number: String
    base_url: String
    model: String
    provider: String
  }

  input CreateIntegrationProviderInput {
    name: String!
    type: IntegrationProviderType!
    description: String
    is_default: Boolean
    is_active: Boolean
    config: IntegrationProviderConfigInput!
  }

  input UpdateIntegrationProviderInput {
    name: String
    description: String
    is_default: Boolean
    is_active: Boolean
    config: IntegrationProviderConfigInput
  }

  input IntegrationProviderFilter {
    type: IntegrationProviderType
    is_active: Boolean
  }

  type IntegrationTestResult {
    ok: Boolean!
    message: String!
  }

  extend type Query {
    integrationProviders(filter: IntegrationProviderFilter): [IntegrationProvider!]!
    integrationProvider(id: ID!): IntegrationProvider
    integrationProviderOptions(type: IntegrationProviderType!): [IntegrationProvider!]!
  }

  extend type Mutation {
    createIntegrationProvider(input: CreateIntegrationProviderInput!): IntegrationProvider!
    updateIntegrationProvider(id: ID!, input: UpdateIntegrationProviderInput!): IntegrationProvider!
    deleteIntegrationProvider(id: ID!): Boolean!
    setDefaultIntegrationProvider(id: ID!): IntegrationProvider!
    testIntegrationProvider(id: ID!): IntegrationTestResult!
  }
`;
