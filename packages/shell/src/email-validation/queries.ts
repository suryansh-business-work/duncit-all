import { gql, type TypedDocumentNode } from '@apollo/client';
import type { EmailValidation, MutationValidateEmailArgs } from '@duncit/gql-types';

/** The fields a validation result shows — the dialog, and Admin's log, read exactly these. */
export type EmailValidationResultData = Pick<
  EmailValidation,
  'id' | 'email' | 'verdict' | 'checks' | 'suggestion' | 'portal' | 'created_at'
>;

export const EMAIL_VALIDATION_RESULT_FIELDS = gql`
  fragment EmailValidationResultFields on EmailValidation {
    id
    email
    verdict
    checks {
      key
      passed
    }
    suggestion
    portal
    created_at
  }
`;

export const VALIDATE_EMAIL: TypedDocumentNode<
  { validateEmail: EmailValidationResultData },
  MutationValidateEmailArgs
> = gql`
  mutation ValidateEmail($email: String!, $portal: String!) {
    validateEmail(email: $email, portal: $portal) {
      ...EmailValidationResultFields
    }
  }
  ${EMAIL_VALIDATION_RESULT_FIELDS}
`;
