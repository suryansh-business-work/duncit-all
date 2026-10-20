import { gql } from '@apollo/client';

export type EventRequestTarget = 'HOST' | 'VENUE';
export type EventRequestStatus = 'OPEN' | 'ACCEPTED' | 'COUNTERED' | 'REJECTED' | 'FULFILLED' | 'DISMISSED';
/** `owner` — the requests addressed to the signed-in partner (Partners portal);
 * `console` — every request of the kind (Venues / Hosts consoles). */
export type EventRequestScope = 'owner' | 'console';

/** The window the owner offered (Accept / Counter offer) and the two figures of its frozen quote. */
export interface EventRequestOffer {
  start_at: string;
  end_at: string;
  pax: number;
  quote: { total: number; venue_payout: number } | null;
}

export interface EventRequestRow {
  id: string;
  target_id: string;
  target_name: string;
  requester_name: string;
  note: string;
  status: EventRequestStatus;
  closed_at: string | null;
  created_at: string;
  response_note: string;
  offer: EventRequestOffer | null;
}

export interface EventRequestCounts {
  open: number;
  accepted: number;
  countered: number;
  rejected: number;
  fulfilled: number;
  dismissed: number;
  total: number;
}

const ROW = `
  total
  rows {
    id
    target_id
    target_name
    requester_name
    note
    status
    closed_at
    created_at
    response_note
    offer {
      start_at
      end_at
      pax
      quote { total venue_payout }
    }
  }
`;

const COUNTS = `
  open
  accepted
  countered
  rejected
  fulfilled
  dismissed
  total
`;

export const MY_RECEIVED_EVENT_REQUESTS_TABLE = gql`
  query MyReceivedEventRequestsTable($target_type: EventRequestTarget!, $query: TableQueryInput) {
    myReceivedEventRequestsTable(target_type: $target_type, query: $query) {
      ${ROW}
    }
  }
`;

export const EVENT_REQUESTS_TABLE = gql`
  query EventRequestsTable($target_type: EventRequestTarget!, $query: TableQueryInput) {
    eventRequestsTable(target_type: $target_type, query: $query) {
      ${ROW}
    }
  }
`;

export const MY_RECEIVED_EVENT_REQUEST_COUNTS = gql`
  query MyReceivedEventRequestCounts($target_type: EventRequestTarget!) {
    myReceivedEventRequestCounts(target_type: $target_type) {
      ${COUNTS}
    }
  }
`;

export const EVENT_REQUEST_COUNTS = gql`
  query EventRequestCounts($target_type: EventRequestTarget!) {
    eventRequestCounts(target_type: $target_type) {
      ${COUNTS}
    }
  }
`;

export const UPDATE_EVENT_REQUEST_STATUS = gql`
  mutation UpdateEventRequestStatus($id: ID!, $status: EventRequestStatus!) {
    updateEventRequestStatus(id: $id, status: $status) {
      id
      status
      closed_at
    }
  }
`;

/** The one read per scope — the table's field name and the counts query. */
export const SCOPE_READS = {
  owner: {
    table: MY_RECEIVED_EVENT_REQUESTS_TABLE,
    tableField: 'myReceivedEventRequestsTable',
    counts: MY_RECEIVED_EVENT_REQUEST_COUNTS,
    countsField: 'myReceivedEventRequestCounts',
  },
  console: {
    table: EVENT_REQUESTS_TABLE,
    tableField: 'eventRequestsTable',
    counts: EVENT_REQUEST_COUNTS,
    countsField: 'eventRequestCounts',
  },
} as const;
