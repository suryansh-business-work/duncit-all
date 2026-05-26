import { gql } from '@apollo/client';

export const HEALTH_SCORE_FIELDS = gql`
  fragment HealthScoreFields on HealthScore {
    subject_type
    subject_id
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
`;

export const MY_ACCOUNT_HEALTH = gql`
  query MyAccountHealth {
    myAccountHealth {
      ...HealthScoreFields
    }
  }
  ${HEALTH_SCORE_FIELDS}
`;

export const MY_VENUE_HEALTH = gql`
  query MyVenueHealth($venue_id: ID!) {
    myVenueHealth(venue_id: $venue_id) {
      ...HealthScoreFields
    }
  }
  ${HEALTH_SCORE_FIELDS}
`;

export interface HealthAdjustment {
  id: string;
  delta: number;
  remark: string;
  created_by_name: string;
  created_at: string;
}

export interface HealthScore {
  subject_type: 'USER' | 'VENUE';
  subject_id: string;
  subject_label: string;
  base_score: number;
  delta_sum: number;
  total_score: number;
  band: 'RED' | 'YELLOW' | 'GREEN';
  adjustments: HealthAdjustment[];
}
