export const partnerDashboardTypeDefs = /* GraphQL */ `
  type PartnerDashboardMetrics {
    total_earning: Float!
    number_of_pods: Int!
    pods_earning: Float!
    venue_earning: Float!
    host_earning: Float!
    product_earning: Float!
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