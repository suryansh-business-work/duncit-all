import { gql } from '@apollo/client';

const METRICS = `
  total_earning
  number_of_pods
  pods_earning
  venue_earning
  host_earning
  product_earning
  added_slots
`;

export const PARTNER_DASHBOARD = gql`
  query PartnerDashboard($from: String!, $to: String!) {
    me {
      user_id
      roles
    }
    partnerDashboard(from: $from, to: $to) {
      from
      to
      summary { ${METRICS} }
      venue { ${METRICS} }
      host { ${METRICS} }
      products { ${METRICS} }
    }
    myVenues {
      id
      venue_name
      venue_type
      city
      locality
      capacity
      status
      is_active
      updated_at
      created_at
    }
    myHostPods(from: $from, to: $to) {
      id
      pod_title
      pod_date_time
      pod_amount
      pod_attendees
      product_cost_total
      completed_at
      is_active
    }
    myProductListings {
      id
      product_name
      image_url
      images
      inventory_count
      requested_count
      available_count
      unit_cost
      commission_pct
      listing_review_status
      updated_at
    }
  }
`;

/* Server-paged table docs for the "Partner performance" tabs (shared table
 * engine). PARTNER_DASHBOARD above keeps feeding the KPI cards, charts, tab
 * counts and role gates — only the tables read these. */

export const DASHBOARD_VENUES_TABLE = gql`
  query PartnerDashboardVenuesTable($query: TableQueryInput) {
    myVenuesTable(query: $query) {
      total
      rows {
        id
        venue_name
        city
        locality
        capacity
        status
        updated_at
        created_at
      }
    }
  }
`;

export const DASHBOARD_HOST_PODS_TABLE = gql`
  query PartnerDashboardHostPodsTable($query: TableQueryInput) {
    myHostPodsTable(query: $query) {
      total
      rows {
        id
        pod_title
        pod_date_time
        pod_amount
        pod_attendees
        is_active
        completed_at
      }
    }
  }
`;

export const DASHBOARD_PRODUCTS_TABLE = gql`
  query PartnerDashboardProductsTable($query: TableQueryInput) {
    myProductListingsTable(query: $query) {
      total
      rows {
        id
        product_name
        available_count
        inventory_count
        unit_cost
        listing_review_status
        updated_at
      }
    }
  }
`;