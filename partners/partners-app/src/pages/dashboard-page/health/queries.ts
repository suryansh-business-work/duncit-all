import { gql } from '@apollo/client';

export const PARTNER_HEALTH = gql`
  query PartnerHealth {
    myAccountHealth {
      subject_type
      subject_id
      subject_label
      base_score
      delta_sum
      total_score
      band
      adjustments { id delta remark created_by_name created_at }
    }
  }
`;

export const PARTNER_VENUE_HEALTH = gql`
  query PartnerVenueHealth($venue_id: ID!) {
    myVenueHealth(venue_id: $venue_id) {
      subject_type
      subject_id
      subject_label
      base_score
      delta_sum
      total_score
      band
      adjustments { id delta remark created_by_name created_at }
    }
  }
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
