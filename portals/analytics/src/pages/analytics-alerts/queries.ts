import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  AnalyticsAlert,
  AnalyticsAlertCheckResult,
  AnalyticsAlertCondition,
  MutationCheckAnalyticsAlertNowArgs,
  MutationCreateAnalyticsAlertArgs,
  MutationDeleteAnalyticsAlertArgs,
  MutationUpdateAnalyticsAlertArgs,
} from '@duncit/gql-types';

export type { AnalyticsAlert, AnalyticsAlertCondition };

const ALERT_FIELDS = `
  id
  name
  entity
  kpi_key
  condition
  threshold
  days
  emails
  slack
  is_active
  last_checked_at
  last_value
  last_status
  last_error
  last_notified_at
  created_at
`;

export const ANALYTICS_ALERTS: TypedDocumentNode<{ analyticsAlerts: AnalyticsAlert[] }> = gql`
  query AnalyticsAlerts {
    analyticsAlerts {
      ${ALERT_FIELDS}
    }
  }
`;

export const CREATE_ANALYTICS_ALERT: TypedDocumentNode<
  { createAnalyticsAlert: AnalyticsAlert },
  MutationCreateAnalyticsAlertArgs
> = gql`
  mutation CreateAnalyticsAlert($input: AnalyticsAlertInput!) {
    createAnalyticsAlert(input: $input) {
      ${ALERT_FIELDS}
    }
  }
`;

export const UPDATE_ANALYTICS_ALERT: TypedDocumentNode<
  { updateAnalyticsAlert: AnalyticsAlert },
  MutationUpdateAnalyticsAlertArgs
> = gql`
  mutation UpdateAnalyticsAlert($id: ID!, $input: AnalyticsAlertInput!) {
    updateAnalyticsAlert(id: $id, input: $input) {
      ${ALERT_FIELDS}
    }
  }
`;

export const DELETE_ANALYTICS_ALERT: TypedDocumentNode<
  { deleteAnalyticsAlert: boolean },
  MutationDeleteAnalyticsAlertArgs
> = gql`
  mutation DeleteAnalyticsAlert($id: ID!) {
    deleteAnalyticsAlert(id: $id)
  }
`;

export const CHECK_ANALYTICS_ALERT_NOW: TypedDocumentNode<
  { checkAnalyticsAlertNow: AnalyticsAlertCheckResult },
  MutationCheckAnalyticsAlertNowArgs
> = gql`
  mutation CheckAnalyticsAlertNow($id: ID!) {
    checkAnalyticsAlertNow(id: $id) {
      status
      value
      error
      notified
    }
  }
`;
