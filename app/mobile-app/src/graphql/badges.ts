import { gql } from '@/generated/graphql';

/**
 * Every badge measured against the signed-in member, locked ones included —
 * RN twin of mWeb's MY_BADGE_PROGRESS. The Badges screen and the profile strip
 * read this one document, so the two can never disagree about what is unlocked.
 */
export const MobileMyBadgeProgressDocument = gql(`
  query MobileMyBadgeProgress {
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
`);
