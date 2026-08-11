import { gql } from '@apollo/client';

export type MailTicketType = 'SUPPORT' | 'GRIEVANCE' | 'REPORT_PROBLEM';

/** A connected mailbox and the rule Support writes for it. */
export interface MailAutomationAccount {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  reply_template: string;
  ai_enabled: boolean;
  ticket_type: MailTicketType;
  sla_min_hours: number;
  sla_max_hours: number;
  sla_label: string;
  is_connected: boolean;
  last_polled_at: string | null;
  last_error: string;
  connected_at: string;
}

export interface MailAutomationThread {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  ticket_type: MailTicketType;
  ticket_no: string;
  replied_at: string | null;
  reply_error: string;
  reply_by_ai: boolean;
  created_at: string;
}

const ACCOUNT_FIELDS = `
  id
  email
  display_name
  is_active
  reply_template
  ai_enabled
  ticket_type
  sla_min_hours
  sla_max_hours
  sla_label
  is_connected
  last_polled_at
  last_error
  connected_at
`;

export const MAIL_AUTOMATION_ACCOUNTS = gql`
  query MailAutomationAccounts {
    mailAutomationAccounts {
      ${ACCOUNT_FIELDS}
    }
  }
`;

export const UPDATE_MAIL_AUTOMATION_RULE = gql`
  mutation UpdateMailAutomationRule($input: MailAutomationRuleInput!) {
    updateMailAutomationRule(input: $input) {
      ${ACCOUNT_FIELDS}
    }
  }
`;

export const MAIL_AUTOMATION_PREVIEW = gql`
  query MailAutomationPreview($input: MailAutomationRuleInput!) {
    mailAutomationPreview(input: $input) {
      text
      by_ai
    }
  }
`;

export const MAIL_AUTOMATION_THREADS = gql`
  query MailAutomationThreads($account_id: ID!, $limit: Int) {
    mailAutomationThreads(account_id: $account_id, limit: $limit) {
      id
      from_email
      from_name
      subject
      ticket_type
      ticket_no
      replied_at
      reply_error
      reply_by_ai
      created_at
    }
  }
`;
