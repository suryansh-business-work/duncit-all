import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  Msg91WidgetAnalytics,
  Msg91WidgetDay,
  Msg91WidgetLog,
  Msg91WidgetLogPage,
  QueryMsg91WidgetAnalyticsArgs,
  QueryMsg91WidgetLogsArgs,
} from '@duncit/gql-types';

export type { Msg91WidgetDay, Msg91WidgetLog };

/**
 * How wide one window may be, in days — MSG91's own limits, mirrored from the
 * server's msg91.gateway (the server imports no @duncit/* package, rule 40).
 */
export const LOGS_MAX_DAYS = 3;
export const ANALYTICS_MAX_DAYS = 31;

export const MSG91_CONFIGURED: TypedDocumentNode<{ msg91Configured: boolean }> = gql`
  query Msg91Configured {
    msg91Configured
  }
`;

export const MSG91_WIDGET_LOGS: TypedDocumentNode<
  { msg91WidgetLogs: Msg91WidgetLogPage },
  QueryMsg91WidgetLogsArgs
> = gql`
  query Msg91WidgetLogs($start_date: String!, $end_date: String!) {
    msg91WidgetLogs(start_date: $start_date, end_date: $end_date) {
      total
      rows {
        request_id
        identifier
        requested_at
        verified
        token_verified
        verify_attempts
        retries
        user_ip
        sms
        whatsapp
        email
        voice
      }
    }
  }
`;

const DAY_FIELDS = `date total verified token_verified retries sms whatsapp email voice`;

export const MSG91_WIDGET_ANALYTICS: TypedDocumentNode<
  { msg91WidgetAnalytics: Msg91WidgetAnalytics },
  QueryMsg91WidgetAnalyticsArgs
> = gql`
  query Msg91WidgetAnalytics($start_date: String!, $end_date: String!) {
    msg91WidgetAnalytics(start_date: $start_date, end_date: $end_date) {
      days { ${DAY_FIELDS} }
      total { ${DAY_FIELDS} }
    }
  }
`;
