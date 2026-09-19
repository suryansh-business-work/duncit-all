import { gql } from '@apollo/client';

export type { StoreListing } from './store-listing.types';

/** Every field the form edits, once — the query and the mutation both read it back. */
const STORE_LISTING_FIELDS = gql`
  fragment StoreListingFields on StoreListing {
    locale
    name
    subtitle
    short_description
    description
    keywords
    whats_new
    copyright
    primary_category
    privacy_policy_url
    support_url
    marketing_url
    contact_email
    contact_phone
    review_first_name
    review_last_name
    demo_account_name
    demo_account_password
    demo_account_required
    review_notes
    iphone_screenshots
    ipad_screenshots
    android_phone_screenshots
    android_tablet_7_screenshots
    android_tablet_10_screenshots
    android_feature_graphic
    android_icon
    updated_by
    updated_at
  }
`;

export const STORE_LISTING = gql`
  query StoreListing {
    storeListing {
      ...StoreListingFields
    }
  }
  ${STORE_LISTING_FIELDS}
`;

export const UPDATE_STORE_LISTING = gql`
  mutation UpdateStoreListing($input: StoreListingInput!) {
    updateStoreListing(input: $input) {
      ...StoreListingFields
    }
  }
  ${STORE_LISTING_FIELDS}
`;

/** Apple's top-level iOS categories, read live. Empty until App Store Connect is connected. */
export const APP_STORE_CATEGORIES = gql`
  query AppStoreCategories {
    appStoreCategories
  }
`;
