import { gql } from '@apollo/client';

export const EVENT_TICKET_FIELDS = gql`
  fragment EventTicketFields on EventTicket {
    id
    ticket_code
    pod_id
    user_id
    status
    checked_in_at
    pod_title
    pod_date_time
    pod_mode
    venue_name
    zone_name
    user_name
    user_email
    created_at
  }
`;

export const EVENT_TICKETS = gql`
  query EventTickets($filter: EventTicketFilterInput) {
    eventTickets(filter: $filter) {
      ...EventTicketFields
    }
  }
  ${EVENT_TICKET_FIELDS}
`;

export const EVENT_TICKET_PDF = gql`
  query EventTicketPdf($id: ID!) {
    eventTicketPdfBase64(ticket_doc_id: $id)
  }
`;

export const VERIFY_EVENT_TICKET = gql`
  mutation VerifyEventTicketQr($token: String!) {
    verifyEventTicketQr(token: $token) {
      ok
      message
      ticket {
        ...EventTicketFields
      }
    }
  }
  ${EVENT_TICKET_FIELDS}
`;

export const CHECK_IN_EVENT_TICKET = gql`
  mutation CheckInEventTicket($input: CheckInEventTicketInput!) {
    checkInEventTicket(input: $input) {
      ...EventTicketFields
    }
  }
  ${EVENT_TICKET_FIELDS}
`;

export interface EventTicketRow {
  id: string;
  ticket_code: string;
  pod_id: string;
  user_id: string;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED';
  checked_in_at: string | null;
  pod_title: string;
  pod_date_time: string | null;
  pod_mode: string;
  venue_name: string | null;
  zone_name: string | null;
  user_name: string;
  user_email: string;
  created_at: string;
}
