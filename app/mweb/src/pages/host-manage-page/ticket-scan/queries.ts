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

/** One extra person a multi-seat ticket admits, recorded at the door. */
export interface PodCompanionInput {
  name: string;
  phone_number: string;
}

export interface HostTicketScanResult {
  ok: boolean;
  message: string;
  already_checked_in: boolean;
  /** True when the ticket admits more people whose details are not on file yet. */
  requires_companions: boolean;
  /** How many still need a name and phone number. */
  companions_required: number;
  ticket: {
    id: string;
    ticket_code: string;
    status: string;
    /** People this one QR admits. 1 for every single-seat and legacy ticket. */
    seats: number;
    checked_in_at: string | null;
  } | null;
  attendee: ScannedAttendee | null;
}

export const HOST_SCAN_POD_TICKET = gql`
  mutation HostScanPodTicket(
    $pod_doc_id: ID!
    $token: String!
    $companions: [PodCompanionInput!]
  ) {
    hostScanPodTicket(pod_doc_id: $pod_doc_id, token: $token, companions: $companions) {
      ok
      message
      already_checked_in
      requires_companions
      companions_required
      ticket {
        id
        ticket_code
        status
        seats
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
