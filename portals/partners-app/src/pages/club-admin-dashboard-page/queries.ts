import { gql } from '@apollo/client';

/** The row and figure shapes these answer with — `ClubAdminDashboard`,
 * `ClubAdminKpis`, `ClubAdminClubRow`, `ClubAdminCategoryRow` — and the
 * empty dashboard live in `@duncit/utils` (`club-admin-dashboard`), where the
 * apps read them too. */
export const CLUB_ADMIN_DASHBOARD = gql`
  query ClubAdminDashboard($from: String, $to: String) {
    clubAdminDashboard(from: $from, to: $to) {
      kpis {
        assigned_clubs
        total_pods
        upcoming_pods
        completed_pods
        total_bookings
        backed_out
        total_attendees
        total_spots
        fill_rate
        total_followers
        new_followers
        avg_rating
        ratings_count
        active_hosts
        total_revenue
        currency_symbol
      }
      trend {
        label
        pods
        bookings
        followers
        revenue
      }
      clubs {
        club_id
        club_slug
        club_name
        total_pods
        upcoming_pods
        completed_pods
        followers
        rating
        revenue
      }
      categories {
        category_id
        name
        super_category
        clubs
        pods
      }
    }
  }
`;

/** Server-paged sibling of the dashboard's per-club rows (shared table engine). */
export const CLUB_ADMIN_DASHBOARD_TABLE = gql`
  query ClubAdminDashboardTable($query: TableQueryInput, $from: String, $to: String) {
    clubAdminDashboardTable(query: $query, from: $from, to: $to) {
      total
      rows {
        club_id
        club_slug
        club_name
        total_pods
        upcoming_pods
        completed_pods
        followers
        rating
        revenue
      }
    }
  }
`;
