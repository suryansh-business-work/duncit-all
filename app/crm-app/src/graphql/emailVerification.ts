import { gql } from '@/generated/graphql';

/** CRM › Tools › Email Verifier — the portal page's check and its history. */
export const CrmAppVerifyEmailDocument = gql(`
  mutation CrmAppVerifyEmail($email: String!) {
    crmVerifyEmail(email: $email) { ...EmailVerificationFields }
  }
  fragment EmailVerificationFields on CrmEmailVerification {
    id email status is_valid_syntax accepts_mail is_deliverable is_catch_all
    is_disposable is_role_account suggestion created_at
  }
`);

export const CrmAppEmailVerificationsDocument = gql(`
  query CrmAppEmailVerifications($query: TableQueryInput) {
    crmEmailVerificationsTable(query: $query) {
      total
      rows { id email status created_at }
    }
  }
`);
