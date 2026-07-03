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

  "Owner-scoped venue KPIs. venue_id narrows to one venue; omitted = all venues."
  type VenueOwnerStats {
    total_venues: Int!
    approved_venues: Int!
    "Sum of every capacity entry across the scoped venues."
    total_capacity: Int!
    "Value of the whole upcoming published calendar (all future slot prices)."
    potential_earning: Int!
    "Value of upcoming slots already booked by pods."
    booked_earning: Int!
    upcoming_slots: Int!
    booked_slots: Int!
    pending_requests: Int!
  }

  extend type Query {
    partnerDashboard(from: String!, to: String!): PartnerDashboard!
    venueOwnerStats(venue_id: ID): VenueOwnerStats!
  }
`;