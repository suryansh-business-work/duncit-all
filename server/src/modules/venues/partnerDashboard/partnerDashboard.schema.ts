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

  "One of the partner's products, as the E-Commerce Brand Dashboard's performance chart plots it."
  type PartnerProductPerformance {
    product_id: ID!
    name: String!
    units_sold: Int!
    "Gross value of this product's sold line items (before Duncit commission)."
    gross_revenue: Float!
    "What the partner keeps on it — gross minus the Duncit commission."
    net_earnings: Float!
  }

  "Owner-scoped e-commerce KPIs. brand_doc_id narrows to one owned brand; omitted = all owned brands."
  type PartnerEcommStats {
    total_brands: Int!
    approved_brands: Int!
    total_products: Int!
    approved_products: Int!
    total_warehouses: Int!
    "Distinct product orders containing at least one of the partner's brand lines (cancelled/failed/RTO excluded)."
    total_orders: Int!
    total_items_sold: Int!
    "Gross value of the partner's sold line items (before Duncit commission)."
    gross_revenue: Float!
    "What the partner actually earns — gross minus the Duncit commission, on the same netted basis as the venue/host payout releases."
    net_earnings: Float!
    "Every sold product, best-selling first, for the performance chart. Empty until something sells."
    product_performance: [PartnerProductPerformance!]!
  }

  extend type Query {
    partnerDashboard(from: String!, to: String!): PartnerDashboard!
    venueOwnerStats(venue_id: ID): VenueOwnerStats!
    partnerEcommStats(brand_doc_id: ID): PartnerEcommStats!
  }
`;