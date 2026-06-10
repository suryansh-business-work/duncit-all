import { gql } from '@/generated/graphql';

/**
 * Signup-survey data: the user's already-picked interests + the active category
 * tree. Mirrors mWeb's `SignupSurveyData` so web and app stay in lock-step.
 */
export const SurveyDataDocument = gql(`
  query MobileSignupSurveyData {
    me {
      user_id
      interest_category_ids
    }
    categoryTree {
      id
      name
      icon
      level
      parent_id
      is_active
    }
  }
`);

export const SaveInterestsDocument = gql(`
  mutation MobileSaveInterests($category_ids: [ID!]!) {
    updateMyInterests(category_ids: $category_ids) {
      user_id
      onboarding_survey_completed
      interest_category_ids
    }
  }
`);
