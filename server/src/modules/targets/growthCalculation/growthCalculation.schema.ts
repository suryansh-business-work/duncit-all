export const growthCalculationTypeDefs = /* GraphQL */ `
  "The nine planning assumptions a Growth Calculator run is made from."
  type GrowthInputs {
    pax_per_pod: Int!
    "Rupees, up to two decimals."
    price_per_pax: Float!
    "Duncit's share of a pod's value, in percent (up to two decimals)."
    profit_margin_pct: Float!
    hosts_per_venue: Int!
    pods_per_host_per_month: Int!
    venues_per_city: Int!
    target_cities: Int!
    "Share of host leads that become hosts, in percent. Never zero."
    host_conversion_pct: Float!
    "Share of venue leads that become venues, in percent. Never zero."
    venue_conversion_pct: Float!
  }

  input GrowthInputsInput {
    pax_per_pod: Int!
    price_per_pax: Float!
    profit_margin_pct: Float!
    hosts_per_venue: Int!
    pods_per_host_per_month: Int!
    venues_per_city: Int!
    target_cities: Int!
    host_conversion_pct: Float!
    venue_conversion_pct: Float!
  }

  """
  Money is a fixed two-decimal rupee string ("320000.00") so it is exact at any
  size; counts are whole numbers carried as Float because they can pass 2^31.
  """
  type GrowthPerPod {
    pod_value: String!
    "Estimated earnings before operational expenses — not net profit."
    earnings_per_pod: String!
  }

  type GrowthPerCity {
    venues: Float!
    hosts: Float!
    monthly_pods: Float!
    monthly_gmv: String!
    monthly_earnings: String!
    host_leads: Float!
    venue_leads: Float!
  }

  type GrowthTotals {
    cities: Float!
    venues: Float!
    hosts: Float!
    monthly_pods: Float!
    host_leads: Float!
    venue_leads: Float!
    total_leads: Float!
    monthly_gmv: String!
    monthly_earnings: String!
    annual_gmv: String!
    annual_earnings: String!
  }

  "Every output a set of inputs produces, from the server's own copy of the formulas."
  type GrowthOutputs {
    per_pod: GrowthPerPod!
    per_city: GrowthPerCity!
    totals: GrowthTotals!
  }

  "Who a calculation is attributed to, as they were when they saved or edited it."
  type GrowthActor {
    user_id: ID!
    name: String!
    email: String
    roles: [String!]!
  }

  "One saved Growth Calculator run: its inputs and outputs as a complete snapshot."
  type GrowthCalculation {
    id: ID!
    title: String!
    description: String!
    inputs: GrowthInputs!
    per_pod: GrowthPerPod!
    per_city: GrowthPerCity!
    totals: GrowthTotals!
    formula_version: Int!
    "Bumped by every edit. Send it back as expected_revision when editing."
    revision: Int!
    calculated_by: GrowthActor!
    last_edited_by: GrowthActor
    last_edited_at: String
    duplicated_from: ID
    created_at: String!
    updated_at: String!
    "Whether the caller may edit or delete it: its creator, or a super admin."
    can_edit: Boolean!
  }

  type GrowthCalculationTablePage {
    rows: [GrowthCalculation!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input SaveGrowthCalculationInput {
    title: String!
    description: String
    inputs: GrowthInputsInput!
    "One id per press of Save; a repeated press returns the record the first one made."
    client_request_id: String
  }

  input UpdateGrowthCalculationInput {
    title: String!
    description: String
    inputs: GrowthInputsInput!
    "The revision the editor loaded. A record edited since is refused (CONFLICT)."
    expected_revision: Int!
  }

  extend type Query {
    "Targets console: every saved calculation (DUNCIT TABLE CONTRACT v1), newest first."
    growthCalculationsTable(query: TableQueryInput): GrowthCalculationTablePage!
    "Targets console: one saved calculation, with its inputs, outputs and creator."
    growthCalculation(id: ID!): GrowthCalculation!
    "Targets console: what a set of inputs produces, without saving anything."
    growthCalculationPreview(inputs: GrowthInputsInput!): GrowthOutputs!
  }

  extend type Mutation {
    "Save a new calculation. The server recalculates every output from the inputs."
    saveGrowthCalculation(input: SaveGrowthCalculationInput!): GrowthCalculation!
    "Edit a calculation (creator or super admin). Creator and creation date are kept."
    updateGrowthCalculation(id: ID!, input: UpdateGrowthCalculationInput!): GrowthCalculation!
    "A new, separate calculation from another one's inputs, attributed to the caller."
    duplicateGrowthCalculation(id: ID!, title: String!, client_request_id: String): GrowthCalculation!
    "Remove a calculation from the list (creator or super admin). The record is kept."
    deleteGrowthCalculation(id: ID!): Boolean!
  }
`;
