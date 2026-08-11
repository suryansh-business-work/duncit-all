import { gql } from '@apollo/client';

/** One board + the caller's own position, re-fetched per tab/period change. */
export const LEADERBOARD_BOARD = gql`
  query LeaderboardBoard($category: LeaderboardCategory!, $period: LeaderboardPeriod) {
    leaderboard(category: $category, period: $period) {
      category
      period
      my_points
      my_rank
      participants
      rows {
        rank
        user_id
        name
        avatar_url
        points
        is_me
      }
    }
  }
`;

/** Points-per-action + active rewards — reference data, cached hard. */
export const LEADERBOARD_CONFIG = gql`
  query LeaderboardConfig {
    leaderboardConfig {
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
      }
    }
  }
`;

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string;
  points: number;
  is_me: boolean;
}

export interface LeaderboardBoardData {
  category: string;
  period: string;
  my_points: number;
  my_rank: number | null;
  participants: number;
  rows: LeaderboardEntry[];
}

export interface LeaderboardReward {
  category: string;
  period: 'MONTHLY' | 'YEARLY';
  rank_from: number;
  rank_to: number;
  title: string;
  description: string;
}

export interface LeaderboardConfigData {
  points_per_join: number;
  points_per_host: number;
  points_per_club_pod: number;
  points_per_venue_pod: number;
  points_per_product_sale: number;
  rewards: LeaderboardReward[];
}
