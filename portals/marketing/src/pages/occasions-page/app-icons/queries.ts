import { gql } from '@apollo/client';
import type { OccasionalIcon } from '@duncit/gql-types';

/** The festive icon windows — read off the public branding, written by marketing. */
export const OCCASION_ICONS = gql`
  query MarketingOccasionIcons {
    branding {
      occasional_icons {
        slug
        label
        starts_at
        ends_at
        icon_url
        fallback_icon
        is_active
        sort_order
      }
    }
  }
`;

export const SAVE_OCCASION_ICONS = gql`
  mutation MarketingSaveOccasionIcons($input: [OccasionalIconInput!]!) {
    updateOccasionalIcons(input: $input) {
      slug
      label
      starts_at
      ends_at
      icon_url
      fallback_icon
      is_active
      sort_order
    }
  }
`;

export type OccasionIcon = Omit<OccasionalIcon, '__typename'>;

export interface OccasionIconsData {
  branding: { occasional_icons: OccasionIcon[] };
}
