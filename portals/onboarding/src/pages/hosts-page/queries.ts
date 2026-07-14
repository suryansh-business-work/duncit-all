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

export interface HostCategoryRow {
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  request_no: string;
}

/** Row shape used by the hosts table columns; rows also carry the full
 * HostRowFields selection so the Edit/Review dialogs can reuse the row object. */
export interface HostRow {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  aadhar_number?: string | null;
  pan_number?: string | null;
  status: string;
  is_active?: boolean | null;
  submitted_at?: string | null;
  host_commission_pct?: number | null;
  host_categories?: HostCategoryRow[] | null;
}

/** Same selection as HOSTS rows (+ created_at for the hidden Created filter
 * column) so table rows keep feeding the Edit/Review dialogs without refetch. */
const HOST_ROW_FIELDS = gql`
  fragment HostRowFields on Host {
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
    created_at
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
`;

export const HOSTS_TABLE = gql`
  query HostsTable($query: TableQueryInput) {
    hostsTable(query: $query) {
      total
      rows {
        ...HostRowFields
      }
    }
  }
  ${HOST_ROW_FIELDS}
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

export const SET_HOST_ACTIVE = gql`
  mutation SetHostActive($id: ID!, $active: Boolean!) {
    setHostActive(host_doc_id: $id, active: $active) {
      id
      is_active
    }
  }
`;

export const DELETE_HOST = gql`
  mutation DeleteHost($id: ID!, $email: String!, $password: String!) {
    deleteHost(host_doc_id: $id, email: $email, password: $password)
  }
`;

export const HOST_DETAILS = gql`
  query HostDetails($host_doc_id: ID!) {
    host(host_doc_id: $host_doc_id) {
      id
      user_id
      full_name
      email
      phone
      full_address
      status
      is_active
      host_commission_pct
      host_categories {
        super_category_name
        category_name
        sub_category_name
        request_no
      }
    }
  }
`;

export const HOST_PODS = gql`
  query HostPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id }) {
      id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_mode
      is_active
      venue_approval_status
      host_names
      club_slug
    }
  }
`;

export interface HostPod {
  id: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time: string | null;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  is_active: boolean;
  venue_approval_status: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';
  host_names: string[];
  club_slug: string;
}

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

/** Status options for the table's select filter ('' All entry excluded). */
export const STATUS_OPTIONS = STATUSES.filter(Boolean).map((s) => ({ value: s, label: s }));
