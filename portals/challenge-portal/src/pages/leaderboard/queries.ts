/**
 * GraphQL documents + hand-written row shapes for Admin > Leaderboard (this
 * portal has no codegen). The interfaces mirror the server SDL in
 * server/src/modules/engagement/leaderboard/leaderboard.schema.ts, and every
 * operation carries an `AdminLeaderboard` prefix so it never collides with
 * mWeb's leaderboard operation names.
 */
import { gql } from '@apollo/client';

export type LeaderboardCategory = 'USER' | 'HOST' | 'CLUB_ADMIN' | 'VENUE' | 'BRAND';
export type LeaderboardPeriod = 'MONTH' | 'YEAR' | 'ALL';
export type LeaderboardRewardPeriod = 'MONTHLY' | 'YEARLY';

/** One headline card per board, from leaderboardAdminStats. */
export interface LeaderboardCategoryStats {
  category: LeaderboardCategory;
  total_points: number;
  awards_count: number;
  participants: number;
}

/** One ranked row of a board. */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string;
  points: number;
  is_me: boolean;
}

/** One board ranked over one window, with the caller's own position. */
export interface LeaderboardBoard {
  category: LeaderboardCategory;
  period: LeaderboardPeriod;
  rows: LeaderboardEntry[];
  my_points: number;
  my_rank: number | null;
  participants: number;
}

/** One points ledger row joined to its user and pod. */
export interface LeaderboardPointRow {
  id: string;
  category: LeaderboardCategory;
  user_id: string;
  user_name: string;
  user_email: string;
  points: number;
  source_type: string;
  source_id: string;
  pod_id: string | null;
  pod_title: string;
  created_at: string;
}

/** A prize promised for finishing a window inside a rank range. */
export interface LeaderboardReward {
  category: LeaderboardCategory;
  period: LeaderboardRewardPeriod;
  rank_from: number;
  rank_to: number;
  title: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

/** The settings singleton — every reward, active or not. */
export interface LeaderboardSettings {
  points_per_join: number;
  points_per_host: number;
  points_per_club_pod: number;
  points_per_venue_pod: number;
  points_per_product_sale: number;
  rewards: LeaderboardReward[];
  updated_at: string | null;
}

export const ADMIN_LEADERBOARD_STATS = gql`
  query AdminLeaderboardStats {
    leaderboardAdminStats {
      category
      total_points
      awards_count
      participants
    }
  }
`;

export const ADMIN_LEADERBOARD_BOARD = gql`
  query AdminLeaderboardBoard($category: LeaderboardCategory!, $period: LeaderboardPeriod) {
    leaderboard(category: $category, period: $period) {
      category
      period
      rows {
        rank
        user_id
        name
        avatar_url
        points
        is_me
      }
      my_points
      my_rank
      participants
    }
  }
`;

export const ADMIN_LEADERBOARD_POINTS_TABLE = gql`
  query AdminLeaderboardPointsTable($query: TableQueryInput) {
    leaderboardPointsTable(query: $query) {
      total
      rows {
        id
        category
        user_id
        user_name
        user_email
        points
        source_type
        source_id
        pod_id
        pod_title
        created_at
      }
    }
  }
`;

export const ADMIN_LEADERBOARD_SETTINGS = gql`
  query AdminLeaderboardSettings {
    leaderboardSettings {
      points_per_join
      points_per_host
      points_per_club_pod
      points_per_venue_pod
      points_per_product_sale
      rewards {
        category
        period
        rank_from
        rank_to
        title
        description
        is_active
        sort_order
      }
      updated_at
    }
  }
`;

export const ADMIN_UPDATE_LEADERBOARD_SETTINGS = gql`
  mutation AdminUpdateLeaderboardSettings($input: UpdateLeaderboardSettingsInput!) {
    updateLeaderboardSettings(input: $input) {
      points_per_join
      points_per_host
      points_per_club_pod
      points_per_venue_pod
      points_per_product_sale
      rewards {
        category
        period
        rank_from
        rank_to
        title
        description
        is_active
        sort_order
      }
      updated_at
    }
  }
`;
