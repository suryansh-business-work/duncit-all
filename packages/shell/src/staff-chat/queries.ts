import { gql } from '@apollo/client';

export interface Coworker {
  id: string;
  name: string;
  email: string;
  photo: string;
  roles: string[];
}

export interface StaffMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  text: string;
  read_at?: string | null;
  created_at?: string | null;
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
  read_at
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
  query StaffMessages($peerId: ID!, $limit: Int) {
    staffMessages(peer_id: $peerId, limit: $limit) {
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
  mutation SendStaffMessage($toUserId: ID!, $text: String!) {
    sendStaffMessage(to_user_id: $toUserId, text: $text) {
      ${MESSAGE}
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
