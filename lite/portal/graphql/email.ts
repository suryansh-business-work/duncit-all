import { gql } from '@apollo/client';

export type LiteEmailStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface LiteEmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  enabled: boolean;
  vars: string[];
  sent_count: number;
  updated_at: string;
}

export interface LiteEmailTemplateInput {
  subject: string;
  body: string;
  enabled: boolean;
}

export interface LiteEmailLogRow {
  id: string;
  to: string;
  subject: string;
  template_key: string;
  status: LiteEmailStatus;
  error: string | null;
  message_id: string | null;
  created_at: string;
}

const TEMPLATE_FIELDS = gql`
  fragment LiteEmailTemplateFields on LiteEmailTemplate {
    id
    key
    name
    description
    subject
    body
    enabled
    vars
    sent_count
    updated_at
  }
`;

export const LITE_EMAIL_TEMPLATES = gql`
  query LiteEmailTemplates {
    liteEmailTemplates {
      ...LiteEmailTemplateFields
    }
  }
  ${TEMPLATE_FIELDS}
`;

export const LITE_UPDATE_EMAIL_TEMPLATE = gql`
  mutation LiteUpdateEmailTemplate($key: String!, $input: LiteEmailTemplateInput!) {
    liteUpdateEmailTemplate(key: $key, input: $input) {
      ...LiteEmailTemplateFields
    }
  }
  ${TEMPLATE_FIELDS}
`;

export const LITE_SEND_TEST_EMAIL = gql`
  mutation LiteSendTestEmail($template_key: String!, $to: String!) {
    liteSendTestEmail(template_key: $template_key, to: $to) {
      ok
      message
    }
  }
`;

export const LITE_EMAIL_LOGS_TABLE = gql`
  query LiteEmailLogsTable($query: TableQueryInput) {
    liteEmailLogsTable(query: $query) {
      rows {
        id
        to
        subject
        template_key
        status
        error
        message_id
        created_at
      }
      total
      page
      page_size
    }
  }
`;
