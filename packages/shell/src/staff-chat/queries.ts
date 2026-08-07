import { gql } from '@apollo/client';

export interface Coworker {
  id: string;
  name: string;
  email: string;
  photo: string;
  roles: string[];
}

/** The six the bar offers. Any other emoji is allowed — these are just close. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;

export interface StaffReaction {
  user_id: string;
  emoji: string;
  at?: string | null;
}

/** What a link in a message turns into on screen. */
export interface StaffLinkPreview {
  url: string;
  internal: boolean;
  portal?: string | null;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  has_access: boolean;
  access_note?: string | null;
}

export interface StaffMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  text: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  read_at?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  /** Who reacted and with what. Empty on a deleted message. */
  reactions?: StaffReaction[];
  /** Set when it reached one of their tabs — the second tick. */
  delivered_at?: string | null;
  reply_to_id?: string | null;
  forwarded_from?: string | null;
  pinned_at?: string | null;
  pinned_by?: string | null;
  mentions?: string[];
  created_at?: string | null;
  /**
   * Client-only, never from the server: a message being sent, or one that
   * failed and can be retried. It is what puts a clock on the first tick.
   */
  pending?: boolean;
  failed?: boolean;
}

export interface StaffCall {
  id: string;
  from_user_id: string;
  to_user_id: string;
  kind: 'AUDIO' | 'VIDEO';
  outcome: 'ANSWERED' | 'MISSED' | 'DECLINED' | 'CANCELLED';
  duration_seconds: number;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface StaffThread {
  peer: Coworker;
  last_text: string;
  last_at?: string | null;
  last_from_me: boolean;
  unread: number;
}

const COWORKER = `
  id
  name
  email
  photo
  roles
`;

const MESSAGE = `
  id
  from_user_id
  to_user_id
  text
  attachment_url
  attachment_name
  attachment_type
  read_at
  edited_at
  deleted_at
  reactions {
    user_id
    emoji
  }
  delivered_at
  reply_to_id
  forwarded_from
  pinned_at
  pinned_by
  mentions
  created_at
`;

export const COWORKERS = gql`
  query Coworkers($search: String, $role: String) {
    coworkers(search: $search, role: $role) {
      ${COWORKER}
    }
  }
`;

export const STAFF_THREADS = gql`
  query StaffThreads {
    staffThreads {
      peer {
        ${COWORKER}
      }
      last_text
      last_at
      last_from_me
      unread
    }
  }
`;

export const STAFF_MESSAGES = gql`
  query StaffMessages($peerId: ID!, $limit: Int, $before: String) {
    staffMessages(peer_id: $peerId, limit: $limit, before: $before) {
      ${MESSAGE}
    }
  }
`;

export const STAFF_UNREAD = gql`
  query StaffUnreadCount {
    staffUnreadCount
  }
`;

export const SEND_STAFF_MESSAGE = gql`
  mutation SendStaffMessage(
    $toUserId: ID!
    $text: String!
    $attachmentUrl: String
    $attachmentName: String
    $attachmentType: String
  ) {
    sendStaffMessage(
      to_user_id: $toUserId
      text: $text
      attachment_url: $attachmentUrl
      attachment_name: $attachmentName
      attachment_type: $attachmentType
    ) {
      ${MESSAGE}
    }
  }
`;

export const EDIT_STAFF_MESSAGE = gql`
  mutation EditStaffMessage($id: ID!, $text: String!) {
    editStaffMessage(id: $id, text: $text) {
      ${MESSAGE}
    }
  }
`;

export const DELETE_STAFF_MESSAGE = gql`
  mutation DeleteStaffMessage($id: ID!) {
    deleteStaffMessage(id: $id) {
      ${MESSAGE}
    }
  }
`;

export const REACT_TO_STAFF_MESSAGE = gql`
  mutation ReactToStaffMessage($id: ID!, $emoji: String!) {
    reactToStaffMessage(id: $id, emoji: $emoji) {
      ${MESSAGE}
    }
  }
`;

export const FORWARD_STAFF_MESSAGE = gql`
  mutation ForwardStaffMessage($id: ID!, $toUserId: ID!) {
    forwardStaffMessage(id: $id, to_user_id: $toUserId) {
      ${MESSAGE}
    }
  }
`;

export const PIN_STAFF_MESSAGE = gql`
  mutation PinStaffMessage($id: ID!) {
    pinStaffMessage(id: $id) {
      ${MESSAGE}
    }
  }
`;

export const PINNED_STAFF_MESSAGES = gql`
  query PinnedStaffMessages($peerId: ID!) {
    pinnedStaffMessages(peer_id: $peerId) {
      ${MESSAGE}
    }
  }
`;

export const SEARCH_STAFF_MESSAGES = gql`
  query SearchStaffMessages($peerId: ID!, $filter: StaffSearchInput) {
    searchStaffMessages(peer_id: $peerId, filter: $filter) {
      ${MESSAGE}
    }
  }
`;

export const STAFF_LINK_PREVIEW = gql`
  query StaffLinkPreview($url: String!) {
    staffLinkPreview(url: $url) {
      url
      internal
      portal
      title
      description
      image
      has_access
      access_note
    }
  }
`;

export const STAFF_CALLS = gql`
  query StaffCalls($peerId: ID!, $limit: Int) {
    staffCalls(peer_id: $peerId, limit: $limit) {
      id
      from_user_id
      to_user_id
      kind
      outcome
      duration_seconds
      started_at
      ended_at
    }
  }
`;

export const STAFF_PRESENCE = gql`
  query StaffPresence {
    staffPresence {
      user_id
      status
      since
    }
  }
`;

export const MARK_THREAD_READ = gql`
  mutation MarkStaffThreadRead($peerId: ID!) {
    markStaffThreadRead(peer_id: $peerId)
  }
`;

/**
 * The consoles a coworker can be filtered by.
 *
 * The same keys the server admits to the directory, in the order the sidebar
 * lists the portals — "who is on the finance team" is the question this answers.
 */
export const ROLE_FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'SUPER_ADMIN', label: 'Admin' },
  { value: 'TECH_MANAGER', label: 'Tech' },
  { value: 'PRODUCTS_MANAGER', label: 'Products' },
  { value: 'MARKETING_MANAGER', label: 'Marketing' },
  { value: 'CRM_MANAGER', label: 'CRM' },
  { value: 'CHALLENGE_MANAGER', label: 'Challenges' },
  { value: 'AI_MANAGER', label: 'AI' },
  { value: 'WEBSITE_MANAGER', label: 'Website' },
  { value: 'HR_MANAGER', label: 'HR' },
  { value: 'FINANCE_MANAGER', label: 'Finance' },
  { value: 'DEVELOPERS_MANAGER', label: 'Developers' },
  { value: 'LEGAL_MANAGER', label: 'Legal' },
  { value: 'ONBOARDING_MANAGER', label: 'Onboarding' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'SUPPORT_MANAGER', label: 'Support' },
  { value: 'ADS_MANAGER', label: 'Ads' },
];

/** Human labels for the chips under a coworker's name. */
export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_FILTERS.filter((r) => r.value).map((r) => [r.value, r.label])
);
