import { gql } from '@apollo/client';

/**
 * Everything the hosts console reads and writes.
 *
 * One module for the list, the record and the editor, because they are one
 * record: the list shows the columns, the detail shows the rest, and the editor
 * writes all of it. Splitting them into three files put the same twenty fields
 * in three selections that then drifted (the venues console still carries that
 * split and its editor had to widen the detail query to catch up).
 */

/** The columns the list renders, off the shared table engine. */
export const HOSTS_TABLE = gql`
  query HostsConsoleTable($query: TableQueryInput) {
    hostsTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        host_no
        user_id
        full_name
        email
        phone
        status
        is_active
        host_commission_pct
        host_categories {
          super_category_name
          category_name
          sub_category_name
        }
        submitted_at
        approved_at
        created_at
      }
    }
  }
`;

/** The whole host record — read by the detail page AND the editor. */
export const HOST_DETAIL = gql`
  query HostConsoleDetail($host_doc_id: ID!) {
    host(host_doc_id: $host_doc_id) {
      id
      host_no
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
      host_categories {
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
        request_no
      }
      survey_category {
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
      }
      step_completed
      status
      is_active
      reviewer_notes
      host_commission_pct
      submitted_at
      approved_at
      rejected_at
      created_at
      updated_at
    }
  }
`;

/** Pods this host runs — `host_user_id` is an allowlisted podsTable filter. */
export const HOST_PODS_TABLE = gql`
  query HostConsolePodsTable($query: TableQueryInput) {
    podsTable(query: $query) {
      total
      rows {
        id
        pod_title
        pod_date_time
        pod_mode
        pod_type
        no_of_spots
        seats_available
        is_active
        venue_approval_status
      }
    }
  }
`;

export const ADMIN_CREATE_HOST = gql`
  mutation HostConsoleCreate(
    $target_user_id: ID!
    $step1: HostStep1Input!
    $step2: HostStep2Input!
    $step3: HostStep3Input!
    $submit: Boolean
  ) {
    adminCreateHost(
      target_user_id: $target_user_id
      step1: $step1
      step2: $step2
      step3: $step3
      submit: $submit
    ) {
      id
      status
    }
  }
`;

export const ADMIN_UPDATE_HOST = gql`
  mutation HostConsoleUpdate(
    $host_doc_id: ID!
    $step1: HostStep1Input!
    $step2: HostStep2Input!
    $step3: HostStep3Input!
    $status: HostStatus
    $categories: [HostCategoryInput!]
  ) {
    adminUpdateHost(
      host_doc_id: $host_doc_id
      step1: $step1
      step2: $step2
      step3: $step3
      status: $status
      categories: $categories
    ) {
      id
      status
    }
  }
`;

export const ADMIN_SET_HOST_CATEGORIES = gql`
  mutation HostConsoleCategories($host_doc_id: ID!, $categories: [HostCategoryInput!]!) {
    adminSetHostCategories(host_doc_id: $host_doc_id, categories: $categories) {
      id
    }
  }
`;

export const SET_HOST_ACTIVE = gql`
  mutation HostConsoleActive($host_doc_id: ID!, $active: Boolean!) {
    setHostActive(host_doc_id: $host_doc_id, active: $active) {
      id
      is_active
    }
  }
`;

/** The commission lives on the host's USER account, not on the host record. */
export const SET_HOST_DEDUCTIONS = gql`
  mutation HostConsoleDeductions($user_id: ID!, $host_commission_pct: Float!) {
    setHostDeductions(user_id: $user_id, host_commission_pct: $host_commission_pct)
  }
`;

export type HostStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface HostCategory {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  request_no?: string;
}

export interface HostRow {
  id: string;
  host_no?: string | null;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  status: HostStatus;
  is_active: boolean;
  host_commission_pct?: number | null;
  host_categories: HostCategory[];
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface HostDetail extends HostRow {
  dob?: string | null;
  aadhar_number: string;
  pan_number: string;
  passport_photo_url: string;
  police_verification_url: string;
  full_address: string;
  bank_account: {
    payout_method?: string | null;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    upi_id: string;
  };
  tags: string[];
  survey_category?: HostCategory | null;
  step_completed: number;
  reviewer_notes: string;
  rejected_at?: string | null;
  updated_at: string;
}

export interface HostPodRow {
  id: string;
  pod_title: string;
  pod_date_time: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  pod_type: 'FREE' | 'PAID';
  no_of_spots: number;
  seats_available: number;
  is_active: boolean;
  venue_approval_status: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';
}
