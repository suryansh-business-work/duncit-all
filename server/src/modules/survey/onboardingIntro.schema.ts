import gql from 'graphql-tag';

export const onboardingIntroTypeDefs = gql`
  "Duncit's social links, shown with their icons on the onboarding survey pages — a blank link is hidden."
  type OnboardingSocialHandles {
    x_url: String!
    instagram_url: String!
    youtube_url: String!
    facebook_url: String!
    website_url: String!
  }

  "The rich-text intro shown first on each onboarding flow — blank fields skip straight to the category picker."
  type OnboardingIntro {
    host_intro_html: String!
    venue_intro_html: String!
    ecomm_intro_html: String!
    club_admin_intro_html: String!
    social_handles: OnboardingSocialHandles!
  }

  "Each link must be a full https:// address, or empty to hide it."
  input OnboardingSocialHandlesInput {
    x_url: String
    instagram_url: String
    youtube_url: String
    facebook_url: String
    website_url: String
  }

  input UpdateOnboardingIntroInput {
    host_intro_html: String
    venue_intro_html: String
    ecomm_intro_html: String
    club_admin_intro_html: String
    social_handles: OnboardingSocialHandlesInput
  }

  extend type Query {
    "Onboarding-intro copy for the four onboarding flows, read before the category picker."
    onboardingIntro: OnboardingIntro!
  }

  extend type Mutation {
    updateOnboardingIntro(input: UpdateOnboardingIntroInput!): OnboardingIntro!
  }
`;
