import { gql } from '@/generated/graphql';

/**
 * The CRM portal Dashboard's read: every venue and host lead, with only the
 * fields the counts use (stage, priority, created date, super category and
 * services) — the same two lists the portal's dashboard reads.
 */
export const CrmAppDashboardDocument = gql(`
  query CrmAppDashboard {
    venueLeads(filter: {}) { ...DashboardVenue }
    hostLeads(filter: {}) { ...DashboardHost }
  }
  fragment DashboardVenue on VenueLead { id lead_status priority created_at super_category_id super_category { name } services_offered { service custom_name } }
  fragment DashboardHost on HostLead { id lead_status priority created_at super_category_id super_category { name } services_offered { service custom_name } }
`);
