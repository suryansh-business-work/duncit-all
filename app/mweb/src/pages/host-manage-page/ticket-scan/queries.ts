import { gql } from '@apollo/client';

/** One scanned attendee — the same shape the native twin renders (rule 27). */
export interface ScannedAttendee {
  user_id: string;
  full_name: string;
  profile_photo: string;
  profile_path: string;
  email: string;
  phone: string;
  whatsapp: string;
  bio: string;
  address: string;
  city: string;
  joined_at: string | null;
}

export interface HostTicketScanResult {
  ok: boolean;
  message: string;
  already_checked_in: boolean;
  ticket: { id: string; ticket_code: string; status: string; checked_in_at: string | null } | null;
  attendee: ScannedAttendee | null;
}

export const HOST_SCAN_POD_TICKET = gql`
  mutation HostScanPodTicket($pod_doc_id: ID!, $token: String!) {
    hostScanPodTicket(pod_doc_id: $pod_doc_id, token: $token) {
      ok
      message
      already_checked_in
      ticket {
        id
        ticket_code
        status
        checked_in_at
      }
      attendee {
        user_id
        full_name
        profile_photo
        profile_path
        email
        phone
        whatsapp
        bio
        address
        city
        joined_at
      }
    }
  }
`;
