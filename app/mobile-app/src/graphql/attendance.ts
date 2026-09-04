import { gql } from '@/generated/graphql';

/**
 * The attendance roster for one hosted pod.
 *
 * Re-declared here rather than imported from `@duncit/host-pod-actions`: that
 * package is MUI, the native app cannot consume it, and codegen only sees
 * documents written inline in this workspace. The SHARED half (row shapes,
 * marked/unmarked split, copy) lives in `@duncit/utils`, which both apps do
 * consume — rule 40's "share logic, never UI".
 */
export const PodAttendanceBoardDocument = gql(`
  query MobilePodAttendanceBoard($pod_doc_id: ID!) {
    podAttendanceBoard(pod_doc_id: $pod_doc_id) {
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_mode
      viewer
      lock
      can_mark
      complete_deadline
      complete_timeout_hours
      otp_required
      marked_count
      total_count
      marked_seats
      total_seats
      rows {
        membership_id
        user_id
        ticket_id
        ticket_code
        name
        avatar_url
        email
        phone_extension
        phone_number
        seats
        attended
        attended_at
        marked_method
        marked_by_name
        verified_phone
        companions {
          name
          phone_extension
          phone_number
          added_at
        }
        companions_required
      }
      club_admins {
        id
        name
        avatar_url
        email
        phone
        whatsapp
      }
    }
  }
`);

/** Send the attendee a code. `mediums` carries SMS / WHATSAPP / both. */
export const RequestAttendanceOtpDocument = gql(`
  mutation MobileRequestPodAttendanceOtp($input: PodAttendanceOtpInput!) {
    requestPodAttendanceOtp(input: $input) {
      challenge_id
      expires_at
      resend_after_seconds
      test_code
      deliveries {
        medium
        status
        reason
      }
    }
  }
`);

/**
 * Send ONE of the extra people a multi-seat booking admits a WhatsApp code.
 *
 * Verified through the same `VerifyAttendanceOtpDocument` below — checking a
 * code grants nothing by itself, and the step that SPENDS this one (the scan
 * that records the group) re-checks the purpose, the booking and the number.
 */
export const RequestCompanionOtpDocument = gql(`
  mutation MobileRequestPodCompanionOtp($input: PodAttendanceOtpInput!) {
    requestPodCompanionOtp(input: $input) {
      challenge_id
      expires_at
      resend_after_seconds
      test_code
      deliveries {
        medium
        status
        reason
      }
    }
  }
`);

/** Check the code that was read out — the attendee's own, or a companion's. */
export const VerifyAttendanceOtpDocument = gql(`
  mutation MobileVerifyPodAttendanceOtp($challenge_id: ID!, $otp: String!) {
    verifyPodAttendanceOtp(challenge_id: $challenge_id, otp: $otp)
  }
`);

/** Mark one attendee present without a scan. */
export const HostMarkAttendanceDocument = gql(`
  mutation MobileHostMarkPodAttendance(
    $pod_doc_id: ID!
    $membership_id: ID!
    $otp_challenge_id: ID
  ) {
    hostMarkPodAttendance(
      pod_doc_id: $pod_doc_id
      membership_id: $membership_id
      otp_challenge_id: $otp_challenge_id
    ) {
      pod_id
    }
  }
`);
