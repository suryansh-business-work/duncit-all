import { gql } from '@apollo/client';

/** Row shape for the admin venues list (read-only — venue workflow lives in the
 * Onboarding portal's Registered Venues). */
export interface VenueRow {
  id: string;
  venue_name: string;
  venue_type?: string | null;
  city?: string | null;
  locality?: string | null;
  capacity?: number | null;
  status: string;
  is_active?: boolean | null;
  pod_count?: number | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  created_at?: string | null;
  venue_category?: {
    super_category_name?: string | null;
    category_name?: string | null;
    sub_category_name?: string | null;
  } | null;
}

export const VENUES_TABLE = gql`
  query AdminVenuesTable($query: TableQueryInput) {
    venuesTable(query: $query) {
      total
      rows {
        id
        venue_name
        venue_type
        city
        locality
        capacity
        status
        is_active
        pod_count
        owner_name
        owner_email
        owner_phone
        created_at
        venue_category {
          super_category_name
          category_name
          sub_category_name
        }
      }
    }
  }
`;

export const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((s) => ({
  value: s,
  label: s,
}));
