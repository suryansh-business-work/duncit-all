import { gql } from '@apollo/client';
import {
  ATTENDEE_SELECTION,
  AUDIT_SELECTION,
  FEEDBACK_SELECTION,
  HOST_SELECTION,
  PAYMENTS_SELECTION,
} from './queries';

/**
 * The region-scoped twins of the admin pod-detail queries.
 *
 * A Regional Club Admin reaches a pod through a MEMBERSHIP CHAIN — their Club
 * Admins, the clubs those people run, the pods in those clubs — and
 * `requireRole` cannot express a chain, so the admin operations refuse them
 * outright. Each operation below hits a resolver gated on the pod belonging to
 * the caller's region instead.
 *
 * Every root field is ALIASED to the admin field name, so the components read
 * one response shape and never branch on who is looking. The selections are the
 * shared constants from ./queries — the three sets feed the same components, so
 * they must not drift.
 */
export const REGION_POD_ATTENDEES = gql`
  query RegionPodAttendeesDetail($id: ID!) {
    adminPodAttendees: regionPodAttendees(pod_doc_id: $id) {
      ${ATTENDEE_SELECTION}
    }
  }
`;

export const REGION_POD_AUDIT_TRAIL = gql`
  query RegionPodAuditTrailDetail($id: ID!) {
    podAuditLogs: regionPodAuditLogs(pod_doc_id: $id) {
      ${AUDIT_SELECTION}
    }
  }
`;

export const REGION_POD_HOST = gql`
  query RegionPodHostDetail($user_id: ID!, $pod_id: ID!) {
    hostByUser: regionPodHost(pod_doc_id: $pod_id, user_id: $user_id) {
      ${HOST_SELECTION}
    }
  }
`;

export const REGION_POD_PAYMENTS = gql`
  query RegionPodPaymentsDetail($pod_id: ID!, $query: TableQueryInput) {
    paymentsTable: regionPodPayments(pod_doc_id: $pod_id, query: $query) {
      ${PAYMENTS_SELECTION}
    }
  }
`;

export const REGION_POD_FEEDBACK = gql`
  query RegionPodFeedbackDetail($pod_id: ID!) {
    podFeedbackSummary: regionPodFeedback(pod_doc_id: $pod_id) {
      ${FEEDBACK_SELECTION}
    }
  }
`;
