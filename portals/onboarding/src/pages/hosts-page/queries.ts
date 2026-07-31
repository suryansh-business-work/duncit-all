import { gql } from '@apollo/client';
import type { HostCategoryValue } from '../../forms/host';

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

/** `host_categories` rows are the same shape the Review dialog's picker emits —
 * ids to save with, denormalized names to render. One type, so a row can go
 * straight from the table into the picker without a cast. */
export type HostCategoryRow = HostCategoryValue;

/** Global default from Finance → Default Deductions. The Review dialog's
 * commission field seeds from this whenever the host has no override, so the
 * number a reviewer sees is the one settlement will actually apply. */
export const DEFAULT_HOST_COMMISSION = gql`
  query DefaultHostCommission {
    defaultHostCommissionPct
  }
`;

/** The Super › Category › Sub the applicant picked in the Earn with Duncit
 * gate. Resolved from their onboarding meeting, so it is available even for
 * hosts whose pick was never copied onto host_categories. */
export const HOST_SURVEY_CATEGORY = gql`
  query HostSurveyCategory($host_doc_id: ID!) {
    host(host_doc_id: $host_doc_id) {
      id
      survey_category {
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

/** Row shape used by the hosts table columns; rows also carry the full
 * HostRowFields selection so the Edit/Review dialogs can reuse the row object. */
export interface HostRow {
  id: string;
  host_no?: string | null;
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
  // Rest of the HostRowFields selection. Optional so the table's own fixtures
  // stay valid; the Review dialog reads them off the same row object.
  dob?: string | null;
  full_address?: string | null;
  passport_photo_url?: string | null;
  police_verification_url?: string | null;
  bank_account?: HostBankAccount | null;
  tags?: string[] | null;
  step_completed?: number | null;
  reviewer_notes?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HostBankAccount {
  payout_method?: string | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  upi_id?: string | null;
}

/** Same selection as HOSTS rows (+ created_at for the hidden Created filter
 * column) so table rows keep feeding the Edit/Review dialogs without refetch. */
const HOST_ROW_FIELDS = gql`
  fragment HostRowFields on Host {
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
    step_completed
    status
    is_active
    submitted_at
    approved_at
    rejected_at
    created_at
    updated_at
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

export const STATUSES = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

/** Replace ONLY a host's operating categories (server denormalizes the names
 * and preserves each triple's request_no linkage). */
export const ADMIN_SET_HOST_CATEGORIES = gql`
  mutation OnboardingSetHostCategories($host_doc_id: ID!, $categories: [HostCategoryInput!]!) {
    adminSetHostCategories(host_doc_id: $host_doc_id, categories: $categories) {
      id
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

/** Status options for the table's select filter ('' All entry excluded). */
export const STATUS_OPTIONS = STATUSES.filter(Boolean).map((s) => ({ value: s, label: s }));
