import { gql } from '@apollo/client';
import type {
  MutationAddManualCaseCommentArgs,
  MutationEditManualCaseCommentArgs,
  QueryManualTestCommentsArgs,
} from '@duncit/gql-types';
import type { ManualComment } from './types';

const COMMENT_FIELDS = `
  id
  body
  edited_at
  created_at
  can_edit
  can_delete
  author {
    id
    name
    photo
  }
`;

export const MANUAL_TEST_COMMENTS = gql`
  query ManualTestComments($case_id: ID!, $offset: Int) {
    manualTestComments(case_id: $case_id, offset: $offset) {
      total
      rows {
        ${COMMENT_FIELDS}
      }
    }
  }
`;

export const ADD_MANUAL_CASE_COMMENT = gql`
  mutation AddManualCaseComment($case_id: ID!, $body: String!) {
    addManualCaseComment(case_id: $case_id, body: $body) {
      ${COMMENT_FIELDS}
    }
  }
`;

export const EDIT_MANUAL_CASE_COMMENT = gql`
  mutation EditManualCaseComment($id: ID!, $body: String!) {
    editManualCaseComment(id: $id, body: $body) {
      ${COMMENT_FIELDS}
    }
  }
`;

export const DELETE_MANUAL_CASE_COMMENT = gql`
  mutation DeleteManualCaseComment($id: ID!) {
    deleteManualCaseComment(id: $id)
  }
`;

export interface CommentsData {
  manualTestComments: { total: number; rows: ManualComment[] };
}
export type CommentsVariables = QueryManualTestCommentsArgs;
export interface AddCommentData {
  addManualCaseComment: ManualComment;
}
export type AddCommentVariables = MutationAddManualCaseCommentArgs;
export interface EditCommentData {
  editManualCaseComment: ManualComment;
}
export type EditCommentVariables = MutationEditManualCaseCommentArgs;
