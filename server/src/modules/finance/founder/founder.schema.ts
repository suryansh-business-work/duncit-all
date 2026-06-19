import gql from 'graphql-tag';

export const founderTypeDefs = gql`
  type FounderPoint {
    label: String!
    value: Float!
  }

  type FounderMetric {
    key: String!
    category: String!
    label: String!
    unit: String!
    value: Float!
    delta_pct: Float
    definition: String!
    formula: String!
    "computed (derived from the database) or manual (founder-entered value)."
    source: String!
    series: [FounderPoint!]!
    "Setting keys the formula reads (editable in the settings drawer)."
    setting_keys: [String!]!
  }

  type FounderCategory {
    key: String!
    label: String!
    icon: String!
    metrics: [FounderMetric!]!
  }

  type FounderSettingKV {
    key: String!
    value: Float!
  }

  type FounderDashboard {
    from: String!
    to: String!
    "The 12 headline founder KPI cards."
    top: [FounderMetric!]!
    categories: [FounderCategory!]!
    settings: [FounderSettingKV!]!
  }

  input FounderSettingInput {
    key: String!
    value: Float!
  }

  extend type Query {
    "Founder/Startup dashboard: every KPI for the date range, computed + manual."
    founderDashboard(from: String, to: String): FounderDashboard!
  }

  extend type Mutation {
    "Save a founder setting (constant / manual metric value)."
    saveFounderSetting(input: FounderSettingInput!): FounderSettingKV!
  }
`;
