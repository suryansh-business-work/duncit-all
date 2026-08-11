import { gql } from '@/generated/graphql';

/** One board + the caller's own position — RN twin of mWeb's LEADERBOARD_BOARD. */
export const MobileLeaderboardBoardDocument = gql(`
  query MobileLeaderboardBoard($category: LeaderboardCategory!, $period: LeaderboardPeriod) {
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
`);

/** Points-per-action + active rewards — RN twin of mWeb's LEADERBOARD_CONFIG. */
export const MobileLeaderboardConfigDocument = gql(`
  query MobileLeaderboardConfig {
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
`);
