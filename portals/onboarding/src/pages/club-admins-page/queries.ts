import { gql } from '@apollo/client';

/** A Club Admin row, and the object every dialog on this page is handed. */
export interface ClubAdminRow {
  id: string;
  club_admin_no?: string | null;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  super_category?: string | null;
  category?: string | null;
  sub_category?: string | null;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  assigned_clubs: { id: string; club_name: string }[];
  status: string;
  is_active: boolean;
  commission_pct?: number | null;
  joined_at?: string | null;
  reviewer_notes?: string | null;
  request_no?: string | null;
}

/** Status options for the table's select filter. */
export const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const ROW_FIELDS = gql`
  fragment ClubAdminRowFields on ClubAdminProfile {
    id
    club_admin_no
    user_id
    full_name
    email
    phone
    super_category
    category
    sub_category
    super_category_id
    category_id
    sub_category_id
    assigned_clubs {
      id
      club_name
    }
    status
    is_active
    commission_pct
    joined_at
    reviewer_notes
    request_no
    created_at
  }
`;

export const CLUB_ADMINS_TABLE = gql`
  ${ROW_FIELDS}
  query ClubAdminProfilesTable($query: TableQueryInput) {
    clubAdminProfilesTable(query: $query) {
      total
      rows {
        ...ClubAdminRowFields
      }
    }
  }
`;

export const MATCHING_CLUBS = gql`
  query ClubAdminMatchingClubs($id: ID!, $search: String) {
    clubAdminMatchingClubs(id: $id, search: $search) {
      id
      club_name
      assigned
      matches_category
    }
  }
`;

export const UPDATE_CLUB_ADMIN = gql`
  mutation UpdateClubAdmin($id: ID!, $input: UpdateClubAdminProfileInput!) {
    updateClubAdminProfile(id: $id, input: $input) {
      id
    }
  }
`;

export const APPROVE_CLUB_ADMIN = gql`
  mutation ApproveClubAdmin($id: ID!, $notes: String) {
    approveClubAdminProfile(id: $id, notes: $notes) {
      id
    }
  }
`;

export const REJECT_CLUB_ADMIN = gql`
  mutation RejectClubAdmin($id: ID!, $notes: String!) {
    rejectClubAdminProfile(id: $id, notes: $notes) {
      id
    }
  }
`;

export const SET_CLUB_ADMIN_COMMISSION = gql`
  mutation SetClubAdminCommission($id: ID!, $commission_pct: Float) {
    setClubAdminCommission(id: $id, commission_pct: $commission_pct) {
      id
      commission_pct
    }
  }
`;

/** Global default from Finance → Default Deductions. The Review dialog's Pay
 * Commission field seeds from this whenever the Club Admin has no override, so
 * the number a reviewer sees is the cut settlement will actually apply. */
export const DEFAULT_CLUB_ADMIN_COMMISSION = gql`
  query DefaultClubAdminCommission {
    defaultClubAdminCommissionPct
  }
`;

export const ASSIGN_CLUB_ADMIN_CLUBS = gql`
  mutation AssignClubAdminClubs($id: ID!, $club_ids: [ID!]!) {
    assignClubAdminClubs(id: $id, club_ids: $club_ids) {
      id
    }
  }
`;

/** Shaped like the other partner types' toggles so useEntityLifecycle fits. */
export const SET_CLUB_ADMIN_ACTIVE = gql`
  mutation SetClubAdminActive($id: ID!, $active: Boolean!) {
    setClubAdminProfileActive(id: $id, is_active: $active) {
      id
      is_active
    }
  }
`;

export const DELETE_CLUB_ADMIN = gql`
  mutation DeleteClubAdmin($id: ID!, $email: String!, $password: String!) {
    deleteClubAdminProfile(id: $id, email: $email, password: $password)
  }
`;

/**
 * A Club Admin is Active only when they have been APPROVED and not switched
 * off. DRAFT (awaiting review) and REJECTED both read Inactive — the table
 * shows the one thing an operator needs, and Review shows why.
 */
export const isActiveClubAdmin = (row: ClubAdminRow) =>
  row.status === 'APPROVED' && row.is_active !== false;

/** The chosen hierarchy as one line: Super > Category > Sub. */
export const categoryPath = (row: ClubAdminRow): string => {
  const parts = [row.super_category, row.category, row.sub_category].filter(Boolean);
  return parts.length ? parts.join(' > ') : '—';
};
