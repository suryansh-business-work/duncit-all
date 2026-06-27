import { gql } from '@apollo/client';

export const HEALTH_FIELDS = gql`
  fragment AdminHealthFields on HealthScore {
    subject_type
    subject_id
    subject_label
    base_score
    delta_sum
    total_score
    band
    adjustments { id delta remark created_by_name created_at }
  }
`;

export const USER_ACCOUNT_HEALTH = gql`
  query AdminUserAccountHealth($user_id: ID!) {
    userAccountHealth(user_id: $user_id) {
      ...AdminHealthFields
    }
  }
  ${HEALTH_FIELDS}
`;

export const VENUE_HEALTH = gql`
  query AdminVenueHealth($venue_id: ID!) {
    venueHealth(venue_id: $venue_id) {
      ...AdminHealthFields
    }
  }
  ${HEALTH_FIELDS}
`;

export const ADJUST_HEALTH = gql`
  mutation AdjustHealth($input: AdjustHealthInput!) {
    adjustHealth(input: $input) {
      ...AdminHealthFields
    }
  }
  ${HEALTH_FIELDS}
`;

export const EDIT_ADJUSTMENT = gql`
  mutation EditAdjustment($input: EditAdjustmentInput!) {
    editAdjustment(input: $input) {
      ...AdminHealthFields
    }
  }
  ${HEALTH_FIELDS}
`;

export const DELETE_ADJUSTMENT = gql`
  mutation DeleteAdjustment($id: ID!) {
    deleteAdjustment(id: $id) {
      ...AdminHealthFields
    }
  }
  ${HEALTH_FIELDS}
`;

export interface AdminHealthAdjustment {
  id: string;
  delta: number;
  remark: string;
  created_by_name: string;
  created_at: string;
}

export interface AdminHealthScore {
  subject_type: 'USER' | 'VENUE';
  subject_id: string;
  subject_label: string;
  base_score: number;
  delta_sum: number;
  total_score: number;
  band: 'RED' | 'YELLOW' | 'GREEN';
  adjustments: AdminHealthAdjustment[];
}
