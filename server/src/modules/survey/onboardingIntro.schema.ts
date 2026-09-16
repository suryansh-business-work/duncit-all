import gql from 'graphql-tag';

export const onboardingIntroTypeDefs = gql`
  "The rich-text intro shown first on each onboarding flow — blank fields skip straight to the category picker."
  type OnboardingIntro {
    host_intro_html: String!
    venue_intro_html: String!
    ecomm_intro_html: String!
    club_admin_intro_html: String!
  }

  input UpdateOnboardingIntroInput {
    host_intro_html: String
    venue_intro_html: String
    ecomm_intro_html: String
    club_admin_intro_html: String
  }

  extend type Query {
    "Onboarding-intro copy for the four onboarding flows, read before the category picker."
    onboardingIntro: OnboardingIntro!
  }

  extend type Mutation {
    updateOnboardingIntro(input: UpdateOnboardingIntroInput!): OnboardingIntro!
  }
`;
