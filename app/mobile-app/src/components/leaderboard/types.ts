/** Structural shapes of the leaderboard GraphQL selections — what the
 * components accept, so they stay decoupled from the generated documents. */

export interface LeaderboardEntryShape {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string;
  points: number;
  is_me: boolean;
}

export interface LeaderboardBoardShape {
  my_points: number;
  my_rank?: number | null;
  participants: number;
  rows: LeaderboardEntryShape[];
}

export interface LeaderboardRewardShape {
  category: string;
  period: string;
  rank_from: number;
  rank_to: number;
  title: string;
  description: string;
}

export interface LeaderboardConfigShape {
  points_per_join: number;
  points_per_host: number;
  points_per_club_pod: number;
  points_per_venue_pod: number;
  points_per_product_sale: number;
  rewards: LeaderboardRewardShape[];
}
