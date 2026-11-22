import { gql, type TypedDocumentNode } from '@apollo/client';
import { EMAIL_VALIDATION_RESULT_FIELDS, type EmailValidationResultData } from '@duncit/shell';
import type { EmailValidation, MutationRevalidateEmailArgs } from '@duncit/gql-types';

/** One log row: the result view's fields plus who ran it, how, and what it re-ran. */
export type EmailValidationLogRow = EmailValidationResultData &
  Pick<EmailValidation, 'source' | 'revalidated_from' | 'checked_by'>;

export const EMAIL_VALIDATIONS_TABLE = gql`
  query EmailValidationsTable($query: TableQueryInput) {
    emailValidationsTable(query: $query) {
      rows {
        ...EmailValidationResultFields
        source
        revalidated_from
        checked_by
      }
      total
      page
      page_size
    }
  }
  ${EMAIL_VALIDATION_RESULT_FIELDS}
`;

export const REVALIDATE_EMAIL: TypedDocumentNode<
  { revalidateEmail: EmailValidationLogRow },
  MutationRevalidateEmailArgs
> = gql`
  mutation RevalidateEmail($id: ID!) {
    revalidateEmail(id: $id) {
      ...EmailValidationResultFields
      source
      revalidated_from
      checked_by
    }
  }
  ${EMAIL_VALIDATION_RESULT_FIELDS}
`;
