import { gql } from '@/generated/graphql';

/**
 * Venue health for a venue the signed-in user owns — RN port of mWeb's
 * MY_VENUE_HEALTH. (Account health reuses MobileAccountHealthDocument.)
 */
export const MobileVenueHealthDocument = gql(`
  query MobileVenueHealth($venue_id: ID!) {
    myVenueHealth(venue_id: $venue_id) {
      subject_label
      base_score
      delta_sum
      total_score
      band
      adjustments {
        id
        delta
        remark
        created_by_name
        created_at
      }
    }
  }
`);
