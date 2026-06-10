import { gql } from '@apollo/client';
import * as yup from 'yup';

export const SURVEY_DATA = gql`
  query SignupSurveyData {
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
`;

export const SAVE_INTERESTS = gql`
  mutation SaveInterests($category_ids: [ID!]!) {
    updateMyInterests(category_ids: $category_ids) {
      user_id
      onboarding_survey_completed
      interest_category_ids
    }
  }
`;

export const MIN_PICKS = 3;

export const surveySchema = yup.object({
  category_ids: yup
    .array()
    .of(yup.string().required())
    .min(MIN_PICKS, `Pick at least ${MIN_PICKS} interests to find your tribe`)
    .required(),
});
