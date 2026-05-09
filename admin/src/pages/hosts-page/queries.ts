import { gql } from '@apollo/client';

export const HOSTS = gql`
  query Hosts($status: HostStatus) {
    hosts(status: $status) {
      id
      full_name
      email
      phone
      dob
      aadhar_number
      pan_number
      passport_photo_url
      police_verification_url
      full_address
      step_completed
      status
      submitted_at
      reviewer_notes
    }
  }
`;

export const APPROVE = gql`
  mutation ApproveHost($id: ID!, $notes: String) {
    approveHost(host_doc_id: $id, notes: $notes) {
      id
    }
  }
`;

export const REJECT = gql`
  mutation RejectHost($id: ID!, $notes: String!) {
    rejectHost(host_doc_id: $id, notes: $notes) {
      id
    }
  }
`;

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
