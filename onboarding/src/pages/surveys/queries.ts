import { gql } from '@apollo/client';

export type QuestionType = 'SECTION' | 'MCQ' | 'TEXT' | 'TEXTAREA';
export type SurveyKind = 'VENUE' | 'HOST';

export interface SurveyQuestion {
  qid: string;
  type: QuestionType;
  label: string;
  help?: string | null;
  required: boolean;
  multi: boolean;
  options: string[];
  sort_order: number;
}

export interface Survey {
  kind: SurveyKind;
  title: string;
  is_active: boolean;
  questions: SurveyQuestion[];
}

const FIELDS = `kind title is_active questions { qid type label help required multi options sort_order }`;

export const SURVEY = gql`
  query Survey($kind: SurveyKind!) {
    survey(kind: $kind) { ${FIELDS} }
  }
`;

export const UPSERT_SURVEY = gql`
  mutation UpsertSurvey($kind: SurveyKind!, $input: UpsertSurveyInput!) {
    upsertSurvey(kind: $kind, input: $input) { ${FIELDS} }
  }
`;
