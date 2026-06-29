export const partnerDashboardTypeDefs = /* GraphQL */ `
  type PartnerDashboardMetrics {
    total_earning: Float!
    number_of_pods: Int!
    pods_earning: Float!
    venue_earning: Float!
    host_earning: Float!
    product_earning: Float!
    "Count of upcoming availability slots the venue owner has published (venue section)."
    added_slots: Int!
  }

  type PartnerDashboard {
    from: String!
    to: String!
    summary: PartnerDashboardMetrics!
    venue: PartnerDashboardMetrics!
    host: PartnerDashboardMetrics!
    products: PartnerDashboardMetrics!
  }

  extend type Query {
    partnerDashboard(from: String!, to: String!): PartnerDashboard!
  }
`;