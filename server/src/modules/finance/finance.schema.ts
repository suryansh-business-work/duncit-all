export const financeTypeDefs = /* GraphQL */ `
  type FinanceSettings {
    platform_fee_pct: Float!
    gst_pct: Float!
    currency_symbol: String!
    invoice_prefix: String!
    dummy_mode: Boolean!
    business_name: String!
    business_address: String!
    business_gstin: String!
    updated_at: String!
  }

  type PublicFinanceSettings {
    platform_fee_pct: Float!
    gst_pct: Float!
    currency_symbol: String!
    dummy_mode: Boolean!
  }

  input UpdateFinanceSettingsInput {
    platform_fee_pct: Float
    gst_pct: Float
    currency_symbol: String
    invoice_prefix: String
    dummy_mode: Boolean
    business_name: String
    business_address: String
    business_gstin: String
  }

  extend type Query {
    financeSettings: FinanceSettings!
    publicFinanceSettings: PublicFinanceSettings!
  }

  extend type Mutation {
    updateFinanceSettings(input: UpdateFinanceSettingsInput!): FinanceSettings!
  }
`;
