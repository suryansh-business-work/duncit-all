import { gql } from '@apollo/client';

export const JOB_APPLICATIONS = gql`
  query JobApplications($status: JobApplicationStatus) {
    jobApplications(status: $status) {
      id
      role_content_id
      role_title
      name
      email
      phone
      resume_url
      portfolio_url
      cover_note
      status
      created_at
    }
  }
`;

export const UPDATE_JOB_APPLICATION_STATUS = gql`
  mutation UpdateJobApplicationStatus($id: ID!, $status: JobApplicationStatus!) {
    updateJobApplicationStatus(application_id: $id, status: $status) {
      id
      status
    }
  }
`;

export type JobApplicationStatus = 'NEW' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';

export interface JobApplication {
  id: string;
  role_content_id: string | null;
  role_title: string;
  name: string;
  email: string;
  phone: string;
  resume_url: string;
  portfolio_url: string;
  cover_note: string;
  status: JobApplicationStatus;
  created_at: string;
}

export const JOB_APPLICATION_STATUSES: JobApplicationStatus[] = [
  'NEW',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
];

export const JOB_APPLICATION_STATUS_COLOR: Record<
  JobApplicationStatus,
  'info' | 'warning' | 'error' | 'success'
> = {
  NEW: 'info',
  SHORTLISTED: 'warning',
  REJECTED: 'error',
  HIRED: 'success',
};
