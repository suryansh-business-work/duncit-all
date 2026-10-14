import { gql } from '@apollo/client';
import type {
  CrmEmailStatus,
  CrmEmailStatusEntry as GqlEmailStatusEntry,
  CrmEmailVerification as GqlEmailVerification,
} from '@duncit/gql-types';

/** Reacher's verdict, plus NOT_CHECKED for an address with no record yet. */
export type CheckedEmailStatus = CrmEmailStatus;
export type EmailStatus = CheckedEmailStatus | 'NOT_CHECKED';

export type CrmEmailStatusEntry = Omit<GqlEmailStatusEntry, '__typename'>;

/** The fields VERIFICATION_FIELDS selects. */
export type CrmEmailVerification = Pick<
  GqlEmailVerification,
  | 'id'
  | 'email'
  | 'status'
  | 'is_valid_syntax'
  | 'accepts_mail'
  | 'is_deliverable'
  | 'is_catch_all'
  | 'is_disposable'
  | 'is_role_account'
  | 'suggestion'
  | 'source'
  | 'checked_by'
  | 'created_at'
>;

const STATUS_ENTRY_FIELDS = 'email status checked_at suggestion';

const VERIFICATION_FIELDS = `
  id email status is_valid_syntax accepts_mail is_deliverable is_catch_all
  is_disposable is_role_account suggestion source checked_by created_at
`;

export const CRM_EMAIL_STATUSES = gql`
  query CrmEmailStatuses($emails: [String!]!) {
    crmEmailStatuses(emails: $emails) { ${STATUS_ENTRY_FIELDS} }
  }
`;

export const CRM_EMAIL_VERIFICATIONS_TABLE = gql`
  query CrmEmailVerificationsTable($query: TableQueryInput) {
    crmEmailVerificationsTable(query: $query) {
      total
      rows { ${VERIFICATION_FIELDS} }
    }
  }
`;

export const CRM_VERIFY_EMAIL = gql`
  mutation CrmVerifyEmail($email: String!) {
    crmVerifyEmail(email: $email) { ${VERIFICATION_FIELDS} }
  }
`;

export const CRM_VERIFY_EMAILS_BULK = gql`
  mutation CrmVerifyEmailsBulk($content_base64: String!, $filename: String, $url: String) {
    crmVerifyEmailsBulk(content_base64: $content_base64, filename: $filename, url: $url) { id total }
  }
`;
