import { gql } from '@apollo/client';
import { BADGE_CONDITIONS, type BadgeCondition } from '@duncit/utils';

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
      category_id
      role_key
      sort_order
      is_active
      updated_at
    }
  }
`;

/** The categories a category-scoped badge can be pointed at. */
export const BADGE_CATEGORIES = gql`
  query BadgeCategories {
    categories {
      id
      name
      level
    }
  }
`;

/** The roles a ROLE_GRANTED badge can be pointed at. */
export const BADGE_ROLES = gql`
  query BadgeRoles {
    roles {
      id
      key
      name
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

/**
 * The label key per condition. Written out as literals (never assembled from
 * the condition) so the translation-key gate can see every key in source, and
 * ordered by {@link BADGE_CONDITIONS} so the dropdown matches the vocabulary
 * the member-facing surfaces render from.
 */
export const CONDITION_LABEL_KEY: Record<BadgeCondition, string> = {
  POD_JOIN_COUNT: 'admin.badgesPage.condPodJoin',
  POD_HOST_COUNT: 'admin.badgesPage.condPodHost',
  CLUB_JOIN_COUNT: 'admin.badgesPage.condClubJoin',
  POD_REFERRAL_COUNT: 'admin.badgesPage.condPodReferral',
  POD_ATTEND_COUNT: 'admin.badgesPage.condPodAttend',
  CATEGORY_POD_ATTEND_COUNT: 'admin.badgesPage.condCategoryAttend',
  PLUS_ONE_POD_COUNT: 'admin.badgesPage.condPlusOne',
  DISTINCT_CATEGORY_COUNT: 'admin.badgesPage.condDistinctCategory',
  MONTHLY_POD_ATTEND_COUNT: 'admin.badgesPage.condMonthlyAttend',
  ROLE_GRANTED: 'admin.badgesPage.condRoleGranted',
  MANUAL: 'admin.badgesPage.condManual',
};

export const CONDITIONS: readonly BadgeCondition[] = BADGE_CONDITIONS;

/** Conditions whose threshold is fixed at one — the field is meaningless. */
const FIXED_AT_ONE = new Set<BadgeCondition>(['ROLE_GRANTED', 'MANUAL']);

export const hasThreshold = (condition: string): boolean =>
  !FIXED_AT_ONE.has(condition as BadgeCondition);

export const needsCategory = (condition: string): boolean =>
  condition === 'CATEGORY_POD_ATTEND_COUNT';

export const needsRole = (condition: string): boolean => condition === 'ROLE_GRANTED';

export interface BadgeForm {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  condition_type: string;
  threshold: number;
  category_id: string;
  role_key: string;
  sort_order: number;
  is_active: boolean;
}

export const emptyBadge: BadgeForm = {
  title: '',
  description: '',
  image_url: '',
  condition_type: 'POD_ATTEND_COUNT',
  threshold: 1,
  category_id: '',
  role_key: '',
  sort_order: 0,
  is_active: true,
};
