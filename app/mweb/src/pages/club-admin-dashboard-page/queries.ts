import { gql } from '@apollo/client';

/**
 * The Club Admin dashboard in one answer — figures, monthly trend, per-club
 * rows and category tiles. The shapes it answers with and the empty dashboard
 * live in `@duncit/utils` (`club-admin-dashboard`), where native reads them
 * too. Its own operation name: the Partners console's is `ClubAdminDashboard`.
 */
export const MWEB_CLUB_ADMIN_DASHBOARD = gql`
  query MwebClubAdminDashboard($from: String, $to: String) {
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
