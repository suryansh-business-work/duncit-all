import gql from 'graphql-tag';

export const commsProviderTypeDefs = gql`
  enum CommsProviderType {
    SMTP
    TWILIO_CALL
  }

  """
  Shared shape for email (SMTP) and call (Twilio) providers. SMTP uses host/
  port/user/pass/from_address/from_name. Fields that don't apply for a given
  type are simply ignored — the server only reads the keys relevant to the
  provider type.
  """
  type CommsProviderConfig {
    host: String
    port: Int
    user: String
    secure: Boolean
    from_address: String
    from_name: String
    reply_to: String

    base_url: String
    sender_email: String
    sender_name: String
    caller_id: String

    has_password: Boolean!
    has_api_key: Boolean!
  }

  type CommsProvider {
    id: ID!
    name: String!
    type: CommsProviderType!
    description: String
    is_default: Boolean!
    is_active: Boolean!
    config: CommsProviderConfig!
    last_used_at: String
    created_at: String
    updated_at: String
  }

  input CommsProviderConfigInput {
    host: String
    port: Int
    user: String
    password: String
    secure: Boolean
    from_address: String
    from_name: String
    reply_to: String

    base_url: String
    api_key: String
    sender_email: String
    sender_name: String
    caller_id: String
  }

  input CreateCommsProviderInput {
    name: String!
    type: CommsProviderType!
    description: String
    is_default: Boolean
    is_active: Boolean
    config: CommsProviderConfigInput!
  }

  input UpdateCommsProviderInput {
    name: String
    description: String
    is_default: Boolean
    is_active: Boolean
    config: CommsProviderConfigInput
  }

  input CommsProviderFilter {
    type: CommsProviderType
    is_active: Boolean
  }

  type CommsProviderTestResult {
    ok: Boolean!
    message: String!
  }

  extend type Query {
    commsProviders(filter: CommsProviderFilter): [CommsProvider!]!
    commsProvider(id: ID!): CommsProvider
    """
    Lightweight selector for portals that need to pick a provider when
    sending an email or making a call. Includes only id, name, type,
    is_default and is_active so the dropdown stays compact.
    """
    commsProviderOptions(type: CommsProviderType!): [CommsProvider!]!
  }

  extend type Mutation {
    createCommsProvider(input: CreateCommsProviderInput!): CommsProvider!
    updateCommsProvider(id: ID!, input: UpdateCommsProviderInput!): CommsProvider!
    deleteCommsProvider(id: ID!): Boolean!
    setDefaultCommsProvider(id: ID!): CommsProvider!
    testCommsProvider(id: ID!, recipient: String!): CommsProviderTestResult!
  }
`;
