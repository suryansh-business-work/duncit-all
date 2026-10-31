import { gql } from '@apollo/client';
import type { StoreOccasion } from '@duncit/gql-types';

/** The ecomm store's festive windows — the storefront at ecomm.duncit.com, not the partner-brand shop. */
export const STORE_OCCASIONS = gql`
  query MarketingStoreOccasions {
    storeOccasions {
      slug
      label
      theme
      effects_enabled
      greeting
      starts_at
      ends_at
      logo_url
      favicon_url
      background_url
      background_color
      announcement_text
      is_active
      sort_order
    }
  }
`;

export const SAVE_STORE_OCCASIONS = gql`
  mutation MarketingSaveStoreOccasions($input: [StoreOccasionInput!]!) {
    storeSaveOccasions(input: $input) {
      slug
    }
  }
`;

export type StoreOccasionRow = Omit<StoreOccasion, '__typename'>;

export interface StoreOccasionsData {
  storeOccasions: StoreOccasionRow[];
}
