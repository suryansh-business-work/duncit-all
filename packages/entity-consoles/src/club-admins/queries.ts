import { gql } from '@apollo/client';

/**
 * Everything the club-admins console reads and writes.
 *
 * One module for the list, the record and the editor, so the twenty fields they
 * share live in one selection (the venues console still carries the older split
 * and its editor had to widen the detail query to catch up).
 */
export const CLUB_ADMINS_TABLE = gql`
  query ClubAdminsConsoleTable($query: TableQueryInput) {
    clubAdminProfilesTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        club_admin_no
        user_id
        full_name
        email
        phone
        super_category
        category
        sub_category
        status
        is_active
        commission_pct
        joined_at
        request_no
        created_at
        assigned_clubs {
          id
          club_name
        }
      }
    }
  }
`;

/** The whole record — read by the detail page AND the editor. */
export const CLUB_ADMIN_DETAIL = gql`
  query ClubAdminConsoleDetail($id: ID!) {
    clubAdminProfile(id: $id) {
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
      status
      is_active
      commission_pct
      joined_at
      reviewer_notes
      request_no
      created_at
      assigned_clubs {
        id
        club_name
      }
    }
  }
`;

/** The Assign Clubs picker: their own taxonomy, plus anything they already run. */
export const CLUB_ADMIN_MATCHING_CLUBS = gql`
  query ClubAdminConsoleMatchingClubs($id: ID!, $search: String) {
    clubAdminMatchingClubs(id: $id, search: $search) {
      id
      club_name
      assigned
      matches_category
    }
  }
`;

export const ADMIN_CREATE_CLUB_ADMIN = gql`
  mutation ClubAdminConsoleCreate($user_id: ID!, $input: UpdateClubAdminProfileInput!) {
    adminCreateClubAdminProfile(user_id: $user_id, input: $input) {
      id
      status
    }
  }
`;

export const UPDATE_CLUB_ADMIN = gql`
  mutation ClubAdminConsoleUpdate($id: ID!, $input: UpdateClubAdminProfileInput!) {
    updateClubAdminProfile(id: $id, input: $input) {
      id
    }
  }
`;

export const ASSIGN_CLUB_ADMIN_CLUBS = gql`
  mutation ClubAdminConsoleAssignClubs($id: ID!, $club_ids: [ID!]!) {
    assignClubAdminClubs(id: $id, club_ids: $club_ids) {
      id
    }
  }
`;

export const APPROVE_CLUB_ADMIN = gql`
  mutation ClubAdminConsoleApprove($id: ID!, $notes: String) {
    approveClubAdminProfile(id: $id, notes: $notes) {
      id
      status
    }
  }
`;

export const REJECT_CLUB_ADMIN = gql`
  mutation ClubAdminConsoleReject($id: ID!, $notes: String!) {
    rejectClubAdminProfile(id: $id, notes: $notes) {
      id
      status
    }
  }
`;

export const SET_CLUB_ADMIN_COMMISSION = gql`
  mutation ClubAdminConsoleCommission($id: ID!, $commission_pct: Float) {
    setClubAdminCommission(id: $id, commission_pct: $commission_pct) {
      id
    }
  }
`;

export const SET_CLUB_ADMIN_ACTIVE = gql`
  mutation ClubAdminConsoleActive($id: ID!, $is_active: Boolean!) {
    setClubAdminProfileActive(id: $id, is_active: $is_active) {
      id
      is_active
    }
  }
`;

/** DRAFT until reviewed, then APPROVED or REJECTED. No SUBMITTED — a Club Admin
 * never applies, so nothing is ever awaiting their side. */
export type ClubAdminStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

export interface AssignedClub {
  id: string;
  club_name: string;
}

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
  status: ClubAdminStatus;
  is_active: boolean;
  commission_pct?: number | null;
  joined_at?: string | null;
  request_no?: string | null;
  created_at?: string | null;
  assigned_clubs: AssignedClub[];
}

export interface ClubAdminDetail extends ClubAdminRow {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  reviewer_notes?: string | null;
}

export interface ClubOption {
  id: string;
  club_name: string;
  assigned: boolean;
  matches_category: boolean;
}
