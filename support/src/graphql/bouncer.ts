import { gql } from '@apollo/client';

export const BOUNCER_SOS_ALERTS = gql`
  query BouncerSosAlerts($status: BouncerSosStatus) {
    bouncerSosAlerts(status: $status) {
      id
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
    }
  }
`;

export const BOUNCER_CALLBACK_REQUESTS = gql`
  query BouncerCallbackRequests($status: BouncerCallbackStatus) {
    bouncerCallbackRequests(status: $status) {
      id
      status
      reason
      contact_phone
      contacted_at
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
  mutation MarkBouncerCallbackContacted($id: ID!) {
    markBouncerCallbackContacted(id: $id) {
      id
      status
      contacted_at
    }
  }
`;

export const CLOSE_CALLBACK = gql`
  mutation CloseBouncerCallback($id: ID!) {
    closeBouncerCallback(id: $id) {
      id
      status
    }
  }
`;

export interface SosAlert {
  id: string;
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
  status: 'PENDING' | 'CONTACTED' | 'CLOSED';
  reason: string;
  contact_phone: string;
  contacted_at: string | null;
  created_at: string;
  user: { id: string; name: string; phone: string | null };
  pod: { id: string; title: string } | null;
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
