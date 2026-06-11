import { gql } from '@apollo/client';

export const SUBMISSIONS = gql`
  query SupportLogs($status: ContactStatus) {
    contactSubmissions(status: $status) {
      id
      name
      email
      subject
      message
      attachments
      status
      created_at
    }
  }
`;

export const UPDATE_STATUS = gql`
  mutation UpdateSupportStatus($id: ID!, $status: ContactStatus!) {
    updateContactStatus(contact_id: $id, status: $status) {
      id
      status
    }
  }
`;

export const STATUSES = ['', 'NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const;

export const COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success'> = {
  NEW: 'primary',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ARCHIVED: 'default',
};

export const TAG_RE = /^\[([A-Z_]+)\]\s*/;

export interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: string[];
  status: string;
  created_at: string;
}
