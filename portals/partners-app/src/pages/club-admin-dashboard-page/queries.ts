import { gql } from '@apollo/client';

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
    }
  }
`;

export interface ClubAdminKpis {
  assigned_clubs: number;
  total_pods: number;
  upcoming_pods: number;
  completed_pods: number;
  total_bookings: number;
  backed_out: number;
  total_attendees: number;
  total_spots: number;
  fill_rate: number;
  total_followers: number;
  new_followers: number;
  avg_rating: number;
  ratings_count: number;
  active_hosts: number;
  total_revenue: number;
  currency_symbol: string;
}

export interface ClubAdminTrendPoint {
  label: string;
  pods: number;
  bookings: number;
  followers: number;
  revenue: number;
}

export interface ClubAdminClubRow {
  club_id: string;
  club_slug: string;
  club_name: string;
  total_pods: number;
  upcoming_pods: number;
  completed_pods: number;
  followers: number;
  rating: number;
  revenue: number;
}

export interface ClubAdminDashboard {
  kpis: ClubAdminKpis;
  trend: ClubAdminTrendPoint[];
  clubs: ClubAdminClubRow[];
}

export const emptyClubAdminKpis: ClubAdminKpis = {
  assigned_clubs: 0,
  total_pods: 0,
  upcoming_pods: 0,
  completed_pods: 0,
  total_bookings: 0,
  backed_out: 0,
  total_attendees: 0,
  total_spots: 0,
  fill_rate: 0,
  total_followers: 0,
  new_followers: 0,
  avg_rating: 0,
  ratings_count: 0,
  active_hosts: 0,
  total_revenue: 0,
  currency_symbol: '₹',
};

export const emptyClubAdminDashboard: ClubAdminDashboard = {
  kpis: emptyClubAdminKpis,
  trend: [],
  clubs: [],
};
