import { gql } from '@apollo/client';
import type { OnboardingIntroSettingsValues } from './onboarding-intro-settings.types';

export interface OnboardingIntroQueryResult {
  onboardingIntro: OnboardingIntroSettingsValues;
}

export const ONBOARDING_INTRO_SETTINGS = gql`
  query OnboardingIntroSettings {
    onboardingIntro {
      host_intro_html
      venue_intro_html
      ecomm_intro_html
      club_admin_intro_html
    }
  }
`;

export const UPDATE_ONBOARDING_INTRO_SETTINGS = gql`
  mutation UpdateOnboardingIntroSettings($input: UpdateOnboardingIntroInput!) {
    updateOnboardingIntro(input: $input) {
      host_intro_html
      venue_intro_html
      ecomm_intro_html
      club_admin_intro_html
    }
  }
`;
