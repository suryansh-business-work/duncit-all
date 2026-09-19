import gql from 'graphql-tag';

export const storeListingTypeDefs = gql`
  """
  Everything the stores ask for when the app is listed, kept once and applied on
  every push from Tech → App Builds. Apple reads name, subtitle, description,
  keywords, what's new, URLs, copyright, category, review contact and the
  iPhone/iPad screenshots; Google Play reads name (title), short description,
  description, what's new (release notes), contact details and the phone/tablet
  screenshots, feature graphic and icon.
  """
  type StoreListing {
    locale: String!
    name: String!
    subtitle: String!
    short_description: String!
    description: String!
    keywords: String!
    whats_new: String!
    copyright: String!
    primary_category: String!
    privacy_policy_url: String!
    support_url: String!
    marketing_url: String!
    contact_email: String!
    contact_phone: String!
    review_first_name: String!
    review_last_name: String!
    demo_account_name: String!
    "Sent to Apple's review team only; returned here because the form has to edit it."
    demo_account_password: String!
    demo_account_required: Boolean!
    review_notes: String!
    iphone_screenshots: [String!]!
    ipad_screenshots: [String!]!
    android_phone_screenshots: [String!]!
    android_tablet_7_screenshots: [String!]!
    android_tablet_10_screenshots: [String!]!
    android_feature_graphic: String!
    android_icon: String!
    updated_by: String!
    updated_at: String
  }

  "Every field is optional: what is sent replaces what was stored, what is left out stays."
  input StoreListingInput {
    locale: String
    name: String
    subtitle: String
    short_description: String
    description: String
    keywords: String
    whats_new: String
    copyright: String
    primary_category: String
    privacy_policy_url: String
    support_url: String
    marketing_url: String
    contact_email: String
    contact_phone: String
    review_first_name: String
    review_last_name: String
    demo_account_name: String
    demo_account_password: String
    demo_account_required: Boolean
    review_notes: String
    iphone_screenshots: [String!]
    ipad_screenshots: [String!]
    android_phone_screenshots: [String!]
    android_tablet_7_screenshots: [String!]
    android_tablet_10_screenshots: [String!]
    android_feature_graphic: String
    android_icon: String
  }

  extend type Query {
    "The one store listing. Tech/Super admin only."
    storeListing: StoreListing!
    """
    Apple's top-level iOS category ids (SOCIAL_NETWORKING, LIFESTYLE, …), read
    live from App Store Connect. Empty until the App Store Connect key is
    configured. Tech/Super admin only.
    """
    appStoreCategories: [String!]!
  }

  extend type Mutation {
    """
    Save the store listing. Lengths are checked here so a push never fails on a
    limit the form could have shown. Tech/Super admin only.
    """
    updateStoreListing(input: StoreListingInput!): StoreListing!
  }
`;
