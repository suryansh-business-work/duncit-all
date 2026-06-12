import { gql } from '@apollo/client';

export type QuestionType = 'SECTION' | 'MCQ' | 'TEXT' | 'TEXTAREA';
export type SurveyKind = 'VENUE' | 'HOST' | 'ECOMM';
export type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

export interface SurveyQuestion {
  qid: string;
  type: QuestionType;
  label: string;
  help?: string | null;
  required: boolean;
  multi: boolean;
  options: string[];
  sort_order?: number;
}

export interface Survey {
  id: string;
  kind: SurveyKind;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  super_category_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;
  title: string;
  is_active: boolean;
  questions: SurveyQuestion[];
  updated_at?: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
  level: CategoryLevel;
  parent_id?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

const FIELDS = `id kind super_category_id category_id sub_category_id super_category_name category_name sub_category_name title is_active updated_at questions { qid type label help required multi options sort_order }`;

export const SURVEYS = gql`
  query Surveys($kind: SurveyKind, $super_category_id: ID, $category_id: ID, $sub_category_id: ID, $search: String) {
    surveys(kind: $kind, super_category_id: $super_category_id, category_id: $category_id, sub_category_id: $sub_category_id, search: $search) {
      id kind super_category_name category_name sub_category_name title is_active updated_at
      questions { qid }
    }
  }
`;

export const SURVEY_BY_ID = gql`
  query SurveyById($id: ID!) {
    surveyById(id: $id) { ${FIELDS} }
  }
`;

export const CREATE_SURVEY = gql`
  mutation CreateSurvey($input: CreateSurveyInput!) {
    createSurvey(input: $input) { ${FIELDS} }
  }
`;

export const UPDATE_SURVEY = gql`
  mutation UpdateSurvey($id: ID!, $input: UpdateSurveyInput!) {
    updateSurvey(id: $id, input: $input) { ${FIELDS} }
  }
`;

export const DELETE_SURVEY = gql`
  mutation DeleteSurvey($id: ID!) {
    deleteSurvey(id: $id)
  }
`;

export const CATEGORIES = gql`
  query OnboardingCategories($level: CategoryLevel!, $parent_id: ID) {
    categories(filter: { level: $level, parent_id: $parent_id }) {
      id name level parent_id is_active sort_order
    }
  }
`;
