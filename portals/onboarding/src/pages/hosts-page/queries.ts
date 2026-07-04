import { gql } from '@apollo/client';

export const HOSTS = gql`
  query Hosts($status: HostStatus) {
    hosts(status: $status) {
      id
      user_id
      full_name
      email
      phone
      dob
      aadhar_number
      pan_number
      passport_photo_url
      police_verification_url
      full_address
      bank_account {
        payout_method
        account_holder_name
        account_number
        ifsc_code
        upi_id
      }
      tags
      step_completed
      status
      is_active
      submitted_at
      reviewer_notes
      host_commission_pct
      host_categories {
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
        request_no
      }
    }
  }
`;

export const APPROVE = gql`
  mutation ApproveHost($id: ID!, $notes: String, $tags: [String!]) {
    approveHost(host_doc_id: $id, notes: $notes, tags: $tags) {
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

export const UPDATE_HOST = gql`
  mutation UpdateHost(
    $id: ID!
    $step1: HostStep1Input!
    $step2: HostStep2Input!
    $step3: HostStep3Input!
    $status: HostStatus
    $categories: [HostCategoryInput!]
  ) {
    adminUpdateHost(
      host_doc_id: $id
      step1: $step1
      step2: $step2
      step3: $step3
      status: $status
      categories: $categories
    ) {
      id
    }
  }
`;

export const SET_HOST_DEDUCTIONS = gql`
  mutation SetHostDeductions($user_id: ID!, $host_commission_pct: Float!) {
    setHostDeductions(user_id: $user_id, host_commission_pct: $host_commission_pct)
  }
`;

export const CATEGORIES = gql`
  query HostEditCategories($level: CategoryLevel!, $parent_id: ID) {
    categories(filter: { level: $level, parent_id: $parent_id }) {
      id
      name
      level
      parent_id
      is_active
      sort_order
    }
  }
`;

export interface CategoryOption {
  id: string;
  name: string;
  level: 'SUPER' | 'CATEGORY' | 'SUB';
  parent_id: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
}

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
