import { gql } from '@apollo/client';

/** Every field the roster draws, in one read — counts, rows and the club's
 * admins, so a locked page can name who to ask without a second query. */
export const POD_ATTENDANCE_BOARD = gql`
  query PodAttendanceBoard($pod_doc_id: ID!) {
    podAttendanceBoard(pod_doc_id: $pod_doc_id) {
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      viewer
      lock
      can_mark
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
`;

/** Send the attendee a code. `mediums` carries SMS / WHATSAPP / both. */
export const REQUEST_ATTENDANCE_OTP = gql`
  mutation RequestPodAttendanceOtp($input: PodAttendanceOtpInput!) {
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
`;

/** Check the code. Spending it happens at the mark, not here. */
export const VERIFY_ATTENDANCE_OTP = gql`
  mutation VerifyPodAttendanceOtp($challenge_id: ID!, $otp: String!) {
    verifyPodAttendanceOtp(challenge_id: $challenge_id, otp: $otp)
  }
`;

/** The whole board comes back, so the page never guesses what the write did. */
export const HOST_MARK_ATTENDANCE = gql`
  mutation HostMarkPodAttendance($pod_doc_id: ID!, $membership_id: ID!, $otp_challenge_id: ID) {
    hostMarkPodAttendance(
      pod_doc_id: $pod_doc_id
      membership_id: $membership_id
      otp_challenge_id: $otp_challenge_id
    ) {
      pod_id
    }
  }
`;

/** The Club Admin's override — no scan, no code, but recorded and notified. */
export const FORCE_ATTENDANCE = gql`
  mutation PodAttendanceClubAdminForce($pod_doc_id: ID!, $membership_id: ID!) {
    clubAdminForceAttendance(pod_doc_id: $pod_doc_id, membership_id: $membership_id) {
      id
      status
      checked_in_at
    }
  }
`;
