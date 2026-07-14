import { gql } from '@apollo/client';

export const USERS = gql`
  query Users($filter: UsersFilter) {
    users(filter: $filter) {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      roles
      profile_photo
      is_email_verified
      auth_providers
      last_login_provider
      last_login_at
      city
      zone
      status
      created_at
    }
    roles {
      id
      key
      name
    }
  }
`;

/** Row shape used by the users table columns. */
export interface UserRow {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  roles?: string[] | null;
  profile_photo?: string | null;
  auth_providers?: string[] | null;
  last_login_provider?: string | null;
  last_login_at?: string | null;
  city?: string | null;
  zone?: string | null;
  status?: string | null;
  created_at?: string | null;
}

/** Same selection as USERS rows — table rows keep feeding the details deep-link. */
const USER_ROW_FIELDS = gql`
  fragment UserRowFields on User {
    user_id
    first_name
    last_name
    full_name
    email
    phone_number
    roles
    profile_photo
    is_email_verified
    auth_providers
    last_login_provider
    last_login_at
    city
    zone
    status
    created_at
  }
`;

export const USERS_TABLE = gql`
  query UsersTable($query: TableQueryInput) {
    usersTable(query: $query) {
      total
      rows {
        ...UserRowFields
      }
    }
  }
  ${USER_ROW_FIELDS}
`;

/** Role catalog for the Role filter options and the Create User dialog. */
export const ROLES = gql`
  query RolesForUsers {
    roles {
      id
      key
      name
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user_id
    }
  }
`;
