import { gql } from '@apollo/client';

// Fields inlined (not a shared fragment) — the portal's MockedProvider test
// setup does not normalize fragment-spread nested objects, so fragments make
// user/pod come back undefined in unit tests.
const SOS_FIELDS = `
  id
  ticket_no
  status
  message
  contact_phone
  acknowledged_at
  resolved_at
  created_at
  location {
    lat
    lng
    accuracy
  }
  user {
    id
    name
    phone
    avatar_url
  }
  host {
    id
    name
    phone
  }
  pod {
    id
    title
    venue_name
    club_name
    starts_at
  }
`;

const CALLBACK_FIELDS = `
  id
  ticket_no
  status
  reason
  contact_phone
  contacted_at
  duration_seconds
  conclusion
  created_at
  user {
    id
    name
    phone
  }
  pod {
    id
    title
  }
`;

export const BOUNCER_SOS_ALERTS = gql`
  query BouncerSosAlerts(
    $status: BouncerSosStatus
    $search: String
    $page: Int
    $page_size: Int
    $sort_by: String
    $sort_dir: String
  ) {
    bouncerSosAlerts(
      status: $status
      search: $search
      page: $page
      page_size: $page_size
      sort_by: $sort_by
      sort_dir: $sort_dir
    ) {
      items {
        ${SOS_FIELDS}
      }
      total
      page
      page_size
    }
  }
`;

export const BOUNCER_SOS_ALERT = gql`
  query BouncerSosAlert($id: ID!) {
    bouncerSosAlert(id: $id) {
      ${SOS_FIELDS}
    }
  }
`;

export const BOUNCER_CALLBACK_REQUESTS = gql`
  query BouncerCallbackRequests(
    $status: BouncerCallbackStatus
    $search: String
    $page: Int
    $page_size: Int
    $sort_by: String
    $sort_dir: String
  ) {
    bouncerCallbackRequests(
      status: $status
      search: $search
      page: $page
      page_size: $page_size
      sort_by: $sort_by
      sort_dir: $sort_dir
    ) {
      items {
        ${CALLBACK_FIELDS}
      }
      total
      page
      page_size
    }
  }
`;

export const BOUNCER_CALLBACK_REQUEST = gql`
  query BouncerCallbackRequest($id: ID!) {
    bouncerCallbackRequest(id: $id) {
      ${CALLBACK_FIELDS}
    }
  }
`;

export const BOUNCER_FEEDBACK = gql`
  query BouncerFeedback {
    bouncerFeedback {
      id
      rating
      category
      message
      created_at
      user {
        id
        name
      }
      host {
        id
        name
      }
      pod {
        id
        title
        venue_name
      }
    }
  }
`;

export const ACK_SOS = gql`
  mutation AcknowledgeBouncerSos($id: ID!) {
    acknowledgeBouncerSos(id: $id) {
      id
      status
      acknowledged_at
    }
  }
`;

export const RESOLVE_SOS = gql`
  mutation ResolveBouncerSos($id: ID!) {
    resolveBouncerSos(id: $id) {
      id
      status
      resolved_at
    }
  }
`;

export const MARK_CALLBACK_CONTACTED = gql`
  mutation MarkBouncerCallbackContacted($id: ID!, $duration_seconds: Int, $conclusion: String) {
    markBouncerCallbackContacted(id: $id, duration_seconds: $duration_seconds, conclusion: $conclusion) {
      id
      status
      contacted_at
      duration_seconds
      conclusion
    }
  }
`;

export const CLOSE_CALLBACK = gql`
  mutation CloseBouncerCallback($id: ID!, $duration_seconds: Int, $conclusion: String) {
    closeBouncerCallback(id: $id, duration_seconds: $duration_seconds, conclusion: $conclusion) {
      id
      status
      duration_seconds
      conclusion
    }
  }
`;

export interface SosAlert {
  id: string;
  ticket_no: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  message: string;
  contact_phone: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  location: { lat: number; lng: number; accuracy: number | null } | null;
  user: { id: string; name: string; phone: string | null; avatar_url: string | null };
  host: { id: string; name: string; phone: string | null } | null;
  pod: {
    id: string;
    title: string;
    venue_name: string | null;
    club_name: string | null;
    starts_at: string | null;
  };
}

export interface CallbackRequest {
  id: string;
  ticket_no: string;
  status: 'PENDING' | 'CONTACTED' | 'CLOSED';
  reason: string;
  contact_phone: string;
  contacted_at: string | null;
  duration_seconds: number | null;
  conclusion: string | null;
  created_at: string;
  user: { id: string; name: string; phone: string | null };
  pod: { id: string; title: string } | null;
}

export interface SosAlertPage {
  items: SosAlert[];
  total: number;
  page: number;
  page_size: number;
}

export interface CallbackRequestPage {
  items: CallbackRequest[];
  total: number;
  page: number;
  page_size: number;
}

export interface FeedbackEntry {
  id: string;
  rating: number;
  category: 'VENUE' | 'HOST' | 'SAFETY' | 'FOOD' | 'OTHER';
  message: string;
  created_at: string;
  user: { id: string; name: string };
  host: { id: string; name: string } | null;
  pod: { id: string; title: string; venue_name: string | null };
}
