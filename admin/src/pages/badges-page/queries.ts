import { gql } from '@apollo/client';

export const BADGES = gql`
  query Badges {
    badges {
      id
      badge_id
      title
      description
      image_url
      condition_type
      threshold
      is_active
      updated_at
    }
  }
`;

export const CREATE_BADGE = gql`
  mutation CreateBadge($input: CreateBadgeInput!) {
    createBadge(input: $input) {
      id
    }
  }
`;

export const UPDATE_BADGE = gql`
  mutation UpdateBadge($id: ID!, $input: UpdateBadgeInput!) {
    updateBadge(badge_doc_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_BADGE = gql`
  mutation DeleteBadge($id: ID!) {
    deleteBadge(badge_doc_id: $id)
  }
`;

export const CONDITIONS = [
  { v: 'POD_JOIN_COUNT', label: 'Pod join count' },
  { v: 'POD_HOST_COUNT', label: 'Pod host count' },
  { v: 'CLUB_JOIN_COUNT', label: 'Club join count' },
  { v: 'POD_REFERRAL_COUNT', label: 'Pod referral count' },
];

export interface BadgeForm {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  condition_type: string;
  threshold: number;
  is_active: boolean;
}

export const emptyBadge: BadgeForm = {
  title: '',
  description: '',
  image_url: '',
  condition_type: 'POD_JOIN_COUNT',
  threshold: 1,
  is_active: true,
};
