import { gql } from '@apollo/client';
import type { BadgeCondition } from '@duncit/utils';

/** One badge and how far along this member is — locked ones included. */
export interface BadgeProgressRow {
  current: number;
  target: number;
  achieved: boolean;
  achieved_at: string | null;
  badge: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    condition_type: BadgeCondition;
    threshold: number;
  };
}

export interface MyBadgeProgressData {
  myBadgeProgress: BadgeProgressRow[];
}

/**
 * The whole catalogue measured against the signed-in member. The Badges page
 * and the profile strip read the SAME query so the two can never disagree
 * about what has been unlocked.
 */
export const MY_BADGE_PROGRESS = gql`
  query MyBadgeProgress {
    myBadgeProgress {
      current
      target
      achieved
      achieved_at
      badge {
        id
        title
        description
        image_url
        condition_type
        threshold
      }
    }
  }
`;
