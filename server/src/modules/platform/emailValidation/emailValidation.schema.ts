import gql from 'graphql-tag';

export const emailValidationTypeDefs = gql`
  "The final word on an address. An UNKNOWN from the mail server is RISKY: neither proof it exists nor that it does not."
  enum EmailValidationVerdict {
    VALID
    RISKY
    INVALID
  }

  "The tests behind a verdict, in the order they run."
  enum EmailValidationCheckKey {
    "The address is well formed."
    SYNTAX
    "The domain has a mail server (MX record)."
    MAIL_SERVER
    "The mail server answered over SMTP."
    SMTP_CONNECTION
    "The mail server confirmed the mailbox exists."
    MAILBOX_EXISTS
    "The mailbox is not disabled."
    MAILBOX_ENABLED
    "The inbox is not full."
    INBOX_HAS_SPACE
    "The domain does not accept every address (catch-all)."
    NOT_CATCH_ALL
    "Not a throwaway (disposable) address."
    NOT_DISPOSABLE
    "Not a shared role address such as info@ or support@."
    NOT_ROLE_ACCOUNT
  }

  "One test. passed is null when it could not run because a test before it failed."
  type EmailValidationCheck {
    key: EmailValidationCheckKey!
    passed: Boolean
  }

  "One validation of one address, from any console. Every one is kept."
  type EmailValidation {
    id: ID!
    email: String!
    verdict: EmailValidationVerdict!
    "The verifier's own status, kept beside the verdict."
    status: CrmEmailStatus!
    checks: [EmailValidationCheck!]!
    "A likely intended address when this one looks like a typo."
    suggestion: String!
    "The console the check ran in (its portal key)."
    portal: String!
    source: CrmEmailCheckSource!
    "Set on a re-run: the validation it re-ran."
    revalidated_from: ID
    "Email of the staff member who ran it."
    checked_by: String!
    created_at: String!
  }

  type EmailValidationTablePage {
    rows: [EmailValidation!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Admin › Email Validations › Logs: every validation every console ran."
    emailValidationsTable(query: TableQueryInput): EmailValidationTablePage!
  }

  extend type Mutation {
    "Validate one address now, from the console named by portal (its portal key)."
    validateEmail(email: String!, portal: String!): EmailValidation!
    "Validate a logged address again. The earlier validation is kept."
    revalidateEmail(id: ID!): EmailValidation!
  }
`;
