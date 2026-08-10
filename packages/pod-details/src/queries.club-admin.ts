import { gql } from '@apollo/client';
import {
  ATTENDEE_SELECTION,
  AUDIT_SELECTION,
  FEEDBACK_SELECTION,
  HOST_SELECTION,
  PAYMENTS_SELECTION,
} from './queries';

/**
 * The club-scoped twins of the admin pod-detail queries.
 *
 * They exist because CLUB_ADMIN is a MEMBERSHIP of a club, not a role on the
 * user: the admin operations are guarded by `requireRole`, which cannot express
 * "administers this pod's club", so they refuse a club admin outright. Each
 * operation below hits a resolver gated on `assertClubAdminForPod` instead.
 *
 * Every root field is ALIASED to the admin field name, so the components read
 * one response shape and never branch on who is looking. The selections are the
 * shared constants from ./queries — the two sets feed the same components, so
 * they must not drift.
 *
 * Note `clubAdminPodPayments` takes a pod id rather than the admin
 * `paymentsTable`'s free-form query input: that input can express "every
 * payment on the platform", so the pod filter is applied server-side where a
 * caller cannot widen it.
 */
export const CLUB_ADMIN_POD_ATTENDEES = gql`
  query ClubAdminPodAttendeesDetail($id: ID!) {
    adminPodAttendees: clubAdminPodAttendees(pod_doc_id: $id) {
      ${ATTENDEE_SELECTION}
    }
  }
`;

export const CLUB_ADMIN_POD_AUDIT_TRAIL = gql`
  query ClubAdminPodAuditTrailDetail($id: ID!) {
    podAuditLogs: clubAdminPodAuditLogs(pod_doc_id: $id) {
      ${AUDIT_SELECTION}
    }
  }
`;

export const CLUB_ADMIN_POD_HOST = gql`
  query ClubAdminPodHostDetail($user_id: ID!, $pod_id: ID!) {
    hostByUser: clubAdminPodHost(pod_doc_id: $pod_id, user_id: $user_id) {
      ${HOST_SELECTION}
    }
  }
`;

export const CLUB_ADMIN_POD_PAYMENTS = gql`
  query ClubAdminPodPaymentsDetail($pod_id: ID!, $query: TableQueryInput) {
    paymentsTable: clubAdminPodPayments(pod_doc_id: $pod_id, query: $query) {
      ${PAYMENTS_SELECTION}
    }
  }
`;

export const CLUB_ADMIN_POD_FEEDBACK = gql`
  query ClubAdminPodFeedbackDetail($pod_id: ID!) {
    podFeedbackSummary: clubAdminPodFeedback(pod_doc_id: $pod_id) {
      ${FEEDBACK_SELECTION}
    }
  }
`;

/** Club Admin's no-scan override. The host's path stays QR-only: a scan is
 * proof the person was at the door, and the host is paid on the result. */
export const CLUB_ADMIN_FORCE_ATTENDANCE = gql`
  mutation ClubAdminForceAttendance($pod_doc_id: ID!, $membership_id: ID!) {
    clubAdminForceAttendance(pod_doc_id: $pod_doc_id, membership_id: $membership_id) {
      id
      status
      checked_in_at
    }
  }
`;
