import { gql } from '@apollo/client';

export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';

export const CONTACT_STATUSES: ContactStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];

export const CONTACT_STATUS_COLOR: Record<ContactStatus, 'default' | 'primary' | 'warning' | 'success'> = {
  NEW: 'primary',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ARCHIVED: 'default',
};

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: string[];
  status: ContactStatus;
  created_at: string;
}

export const CONTACT_SUBMISSIONS = gql`
  query ContactSubmissions($status: ContactStatus) {
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

/** Rows keep message + attachments so the detail dialog opens without a second fetch. */
export const CONTACT_TABLE = gql`
  query ContactSubmissionsTable($query: TableQueryInput) {
    contactSubmissionsTable(query: $query) {
      total
      rows {
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
  }
`;

export const UPDATE_CONTACT_STATUS = gql`
  mutation UpdateContactStatus($id: ID!, $status: ContactStatus!) {
    updateContactStatus(contact_id: $id, status: $status) {
      id
      status
    }
  }
`;
